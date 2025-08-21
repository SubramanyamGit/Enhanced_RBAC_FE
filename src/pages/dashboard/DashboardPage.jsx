import { Row, Col, Spinner } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import PermissionsOverview from "../../components/PermissionsOverview";

const DashboardPage = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center w-100 h-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  const { full_name, permissions } = user || {};

  return (
    <div className="dashboard w-100 h-100">
      <div className="mb-4">
        <h2 className="fw-semibold text-dark">Dashboard</h2>
        <p className="text-muted">
          Welcome back, <strong>{full_name || "User"}</strong>
        </p>
      </div>

      <Row className="g-4">
        <Col xs={12}>
          <PermissionsOverview permissions={permissions} />
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
