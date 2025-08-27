import React, { useState } from "react";
import { Tabs, Tab, Button, Spinner, Form, Modal } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import {
  useRequestsByStatus,
  useCreateRequest,
  useApproveRequest,
  useRejectRequest,
} from "../../hooks/useRequests";
import CustomTable from "../../components/CustomTable";
import { toast } from "react-toastify";
import Select from "react-select";
import dayjs from "dayjs";

const RequestPage = () => {
  const { user } = useAuth();
  const { data: allPermissions = [] } = usePermissions();

  const [tab, setTab] = useState("Pending");

  const {
    data: requests = [],
    isLoading,
    isFetching,
  } = useRequestsByStatus(tab);

  const createRequest = useCreateRequest();
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();

  const [showModal, setShowModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const [submitted, setSubmitted] = useState(false);

  const [actionModal, setActionModal] = useState({
    show: false,
    type: "",
    row: null,
  });
  const [rejectionReason, setRejectionReason] = useState("");

  const canCreate = user?.permissions?.requests?.includes("create_requests");
  const canApprove = user?.permissions?.requests?.includes("approve_requests");
  const canReject = user?.permissions?.requests?.includes("reject_requests");

  const permissionOptions = allPermissions.map((p) => ({
    value: p.permission_id,
    label: p.name,
  }));

  const handleCreate = async () => {
    setSubmitted(true);

    if (!selectedPermission || !reason.trim()) {
      return; // stop submission if validation fails
    }

    try {
      await createRequest.mutateAsync({
        permission_name: selectedPermission.label,
        permission_id: selectedPermission.value,
        reason: reason.trim(),
        expires_at: expiresAt || null,
      });
      toast.success("Request submitted");
      setShowModal(false);
      setReason("");
      setExpiresAt("");
      setSelectedPermission(null);
      setSubmitted(false);
    } catch {
      toast.error("Failed to submit");
    }
  };

  const openActionModal = (row, type) => {
    setActionModal({ show: true, type, row });
    setRejectionReason("");
  };

  const handleActionConfirm = async () => {
    const { type, row } = actionModal;

    const payload = {
      id: row.request_id,
      requested_by: row.requested_by,
      permission_id: row.permission_id,
      permission_name: row.permission_name,
    };

    try {
      if (type === "approve") {
        await approveRequest.mutateAsync(payload);
        toast.success("Approved successfully");
      } else {
        if (!rejectionReason) {
          toast.error("Rejection reason is required");
          return;
        }
        await rejectRequest.mutateAsync({
          ...payload,
          rejection_reason: rejectionReason,
        });
        toast.success("Rejected successfully");
      }
      setActionModal({ show: false, type: "", row: null });
    } catch {
      toast.error("Action failed");
    }
  };

  const columns = [
    { header: "Permission", accessor: "permission_name" },
    { header: "Reason", accessor: "reason" },
    { header: "Status", accessor: "status" },
    {
      header: "Requested At",
      accessor: (row) =>
        row.requested_at
          ? dayjs(row.requested_at).format("MMM D, YYYY h:mm A")
          : "-",
    },
    {
      header: "Expires At",
      accessor: (row) =>
        row.expires_at
          ? dayjs(row.expires_at).format("MMM D, YYYY h:mm A")
          : "-",
    },
    ...(user?.permissions?.requests?.includes("approve_requests") ||
    user?.permissions?.requests?.includes("reject_requests")
      ? [{ header: "Requested By", accessor: "requested_by_name" }]
      : []),
    ...(tab !== "Pending"
      ? [{ header: "Reviewed By", accessor: "reviewed_by_name" }]
      : []),
    ...(canApprove || canReject
      ? tab === "Pending"
        ? [
            {
              header: "Actions",
              accessor: (row) => {
                const anyMutationPending =
                  approveRequest.isPending || rejectRequest.isPending;
                return (
                  <>
                    {canApprove && (
                      <Button
                        variant="success"
                        size="sm"
                        className="me-2"
                        disabled={anyMutationPending}
                        onClick={() => openActionModal(row, "approve")}
                      >
                        Approve
                      </Button>
                    )}
                    {canReject && (
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={anyMutationPending}
                        onClick={() => openActionModal(row, "reject")}
                      >
                        Reject
                      </Button>
                    )}
                  </>
                );
              },
            },
          ]
        : []
      : []),
  ];

  const table = (
    <CustomTable
      columns={columns}
      data={requests}
      isLoading={isLoading || isFetching}
      itemsPerPage={5}
      emptyMessage={`No ${tab.toLowerCase()} requests found`}
      showSearch={false}
    />
  );

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Permission Requests</h3>
        {canCreate && (
          <Button variant="primary" onClick={() => setShowModal(true)}>
            + Request Permission
          </Button>
        )}
      </div>

      <Tabs activeKey={tab} onSelect={(k) => k && setTab(k)}>
        <Tab eventKey="Pending" title="Pending" />
        <Tab eventKey="Approved" title="Approved" />
        <Tab eventKey="Rejected" title="Rejected" />
      </Tabs>

      {isLoading || isFetching ? (
        <div className="d-flex align-items-center gap-2 mt-3">
          <Spinner animation="border" size="sm" />
          <span>Loading {tab.toLowerCase()} requests…</span>
        </div>
      ) : (
        table
      )}

      {/* Request Permission Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Request Permission</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* Permission Field */}
            <Form.Group>
              <Form.Label>Permission</Form.Label>
              <Select
                options={permissionOptions}
                value={selectedPermission}
                onChange={setSelectedPermission}
              />
              {submitted && !selectedPermission && (
                <div className="invalid-feedback d-block">
                  Permission is required.
                </div>
              )}
            </Form.Group>

            {/* Reason Field */}
            <Form.Group className="mt-3">
              <Form.Label>Reason</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                isInvalid={submitted && !reason.trim()}
                placeholder="Describe why you need this permission"
              />
              <Form.Control.Feedback type="invalid">
                Reason is required.
              </Form.Control.Feedback>
            </Form.Group>

            {/* Expires At Field */}
            <Form.Group className="mt-3">
              <Form.Label>Expires At</Form.Label>
              <Form.Control
                type="datetime-local"
                min={new Date().toISOString().slice(0, 16)}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </Form.Group>

            <Button
              className="mt-4"
              onClick={handleCreate}
              disabled={createRequest.isPending}
            >
              {createRequest.isPending ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Approve/Reject Confirmation Modal */}
      <Modal
        show={actionModal.show}
        onHide={() => setActionModal({ show: false, type: "", row: null })}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-semibold">
            {`Are you sure you want to ${actionModal.type} `}
            <strong>{actionModal?.row?.permission_name}</strong>
            {` for `}
            <strong>{actionModal?.row?.requested_by_name}</strong>?
          </Modal.Title>
        </Modal.Header>

        {actionModal.type === "reject" && (
          <Modal.Body className="border-0">
            <Form.Group className="mt-2">
              <Form.Label>Reason for Rejection</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason..."
              />
            </Form.Group>
          </Modal.Body>
        )}

        <Modal.Footer className="border-0">
          <Button
            variant="secondary"
            onClick={() => setActionModal({ show: false, type: "", row: null })}
            disabled={approveRequest.isPending || rejectRequest.isPending}
          >
            Cancel
          </Button>
          <Button
            variant={actionModal.type === "approve" ? "success" : "danger"}
            onClick={handleActionConfirm}
            disabled={approveRequest.isPending || rejectRequest.isPending}
          >
            {(approveRequest.isPending || rejectRequest.isPending) ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                Processing...
              </>
            ) : (
              "Confirm"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default RequestPage;
