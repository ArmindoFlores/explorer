import React, { useState } from "react";

import type { MapPin } from "./MapPinIcon";
import Modal from "react-modal";
import styles from "./BaseModal.module.css";

type Props = {
    isOpen: boolean;
    pin: MapPin;
    onRequestClose: () => void;
    onCommit: (updated: MapPin) => void;
};

export function EditPinModal({ isOpen, pin, onRequestClose, onCommit }: Props) {
    const [name, setName] = useState(pin.name);
    const [description, setDescription] = useState(pin.description);
    const [metadata, setMetadata] = useState(pin.metadata);
    const [visible, setVisible] = useState(pin.visible);

    function handleSubmit(e: React.SubmitEvent) {
        e.preventDefault();
        if (!pin) return;
        onCommit({ ...pin, name, description, metadata, visible });
        onRequestClose();
    }

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            className={styles.dialog}
            overlayClassName={styles.overlay}
            ariaHideApp={false}
        >
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Edit pin</h2>
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onRequestClose}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="pin-name">
                        Name
                    </label>
                    <input
                        id="pin-name"
                        className={styles.input}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Pin name"
                        required
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="pin-description">
                        Description
                    </label>
                    <textarea
                        id="pin-description"
                        className={styles.textarea}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional description&hellip;"
                        rows={3}
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="pin-metadata">
                        Metadata
                    </label>
                    <textarea
                        id="pin-metadata"
                        className={styles.textarea}
                        value={metadata}
                        onChange={(e) => setMetadata(e.target.value)}
                        placeholder="Optional metadata&hellip;"
                        rows={3}
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={visible}
                            onChange={(e) => setVisible(e.target.checked)}
                        />
                        Visible on map
                    </label>
                </div>

                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={onRequestClose}
                    >
                        Cancel
                    </button>
                    <button type="submit" className={styles.submitButton}>
                        Save
                    </button>
                </div>
            </form>
        </Modal>
    );
}
