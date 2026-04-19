import { useAuth } from '../../context/AuthContext'
import { FiUser, FiMapPin } from 'react-icons/fi'
import '../../styles/pages/patient/PatientProfile.css'

export default function PatientProfile() {
    const { user } = useAuth()

    return (
        <div className="patient-profile">
            <div className="page-header">
                <h1>My Profile</h1>
            </div>

            <div className="profile-card">
                <div className="profile-avatar">
                    {user?.name?.charAt(0) || 'P'}
                </div>
                <h2>{user?.name || 'Patient'}</h2>
                <p className="profile-role">Patient</p>

                <div className="profile-details">
                    <div className="detail-item">
                        <FiUser />
                        <div>
                            <label>Patient ID</label>
                            <p>{user?.patientId || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="detail-item">
                        <FiMapPin />
                        <div>
                            <label>Ward</label>
                            <p>{user?.wardNumber || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="detail-item">
                        <FiMapPin />
                        <div>
                            <label>Bed Number</label>
                            <p>{user?.bedNumber || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}