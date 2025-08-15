// In components/admin/ActionsDropdown.js
'use client';

import { useState, useEffect, useRef } from 'react';

export default function ActionsDropdown({ actions }) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // This effect handles closing the dropdown when clicking outside of it
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    if (!actions || actions.length === 0) {
        return null; // Don't render anything if there are no actions
    }

    return (
        <div className="actions-dropdown-wrapper" ref={wrapperRef}>
            <button 
                className="actions-trigger-btn cta-button" 
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <i className="fas fa-ellipsis-v"></i> {/* Three-dots icon */}
            </button>

            {isOpen && (
                <div className="actions-dropdown-menu glass">
                    {actions.map((action, index) => (
                        <button 
                            key={index} 
                            className={`actions-dropdown-item ${action.className || ''}`}
                            onClick={() => {
                                action.onClick();
                                setIsOpen(false); // Close menu after action
                            }}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}