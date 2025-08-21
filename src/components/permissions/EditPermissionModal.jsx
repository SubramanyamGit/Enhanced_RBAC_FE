import React from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useUpdatePermission } from '../../hooks/usePermissions';
import { toast } from 'react-toastify';

const EditPermissionModal = ({ show, permission, onClose, onSuccess }) => {
  const updatePermission = useUpdatePermission();
  const isBusy = updatePermission.isPending || updatePermission.isLoading;

  const formik = useFormik({
    initialValues: {
      name: permission?.name || '',
      description: permission?.description || '',
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      name: Yup.string().required('Permission name is required'),
    }),
    onSubmit: async (values) => {
      try {
        await updatePermission.mutateAsync({
          id: permission.permission_id,
          data: values,
        });
        toast.success('Permission updated');
        onSuccess();
      } catch {
        toast.error('Failed to update permission');
      }
    },
  });

  if (!permission) return null;

  return (
    <Modal
      show={show}
      onHide={isBusy ? undefined : onClose}
      backdrop={isBusy ? 'static' : true}
      keyboard={!isBusy}
    >
      <Modal.Header closeButton={!isBusy}>
        <Modal.Title>Edit Permission</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={formik.handleSubmit}>
          <Form.Group>
            <Form.Label>Permission Name</Form.Label>
            <Form.Control
              name="name"
              value={formik.values.name}
              onChange={formik.handleChange}
              isInvalid={formik.touched.name && !!formik.errors.name}
              disabled={isBusy}
            />
            <Form.Control.Feedback type="invalid">
              {formik.errors.name}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              name="description"
              value={formik.values.description}
              onChange={formik.handleChange}
              disabled={isBusy}
            />
          </Form.Group>

          <Button
            type="submit"
            className="mt-4"
            variant="primary"
            disabled={isBusy}
          >
            {isBusy ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Updating...
              </>
            ) : (
              'Update'
            )}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditPermissionModal;
