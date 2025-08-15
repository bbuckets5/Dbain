// In app/admin-dashboard/page.js
'use client';

import { useState } from 'react';
import Link from 'next/link';
import ManageEventsTab from '@/components/admin/ManageEventsTab';
import ManageUsersTab from '@/components/admin/ManageUsersTab';
import AddNewEventTab from '@/components/admin/AddNewEventTab';
import ManageSalesTab from '@/components/admin/ManageSalesTab'; // Import the new component

export default function AdminDashboardPage() {
    const [activeTab, setActiveTab] = useState('manage-events');

    const handleEventAdded = () => {
        setActiveTab('manage-events');
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'manage-events':
                return <ManageEventsTab />;
            case 'manage-users':
                return <ManageUsersTab />;
            case 'add-new-event':
                return <AddNewEventTab onEventAdded={handleEventAdded} />;
            case 'manage-sales':
                return <ManageSalesTab />; // Add the case for the new tab
            default:
                return null;
        }
    };

    return (
        <main className="main-content">
            <h1>Admin Dashboard</h1>
            <div className="tabs-nav">
                <button 
                    className={`tab-btn ${activeTab === 'manage-events' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('manage-events')}
                >
                    Manage Events
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'manage-users' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('manage-users')}
                >
                    Manage Users
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'manage-sales' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('manage-sales')}
                >
                    <i className="fas fa-dollar-sign"></i> Manage Sales
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'add-new-event' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('add-new-event')}
                >
                    Add New Event
                </button>
                <Link href="/checkin" className="tab-btn">
                    <i className="fas fa-qrcode"></i> Event Check-in
                </Link>
            </div>
            
            <div>
                {renderTabContent()}
            </div>
        </main>
    );
}