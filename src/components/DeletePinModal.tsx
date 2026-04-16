import type { MapPin } from "./MapPinIcon";
import Modal from "react-modal";
import styles from "./BaseModal.module.css";

type Props = {
    isOpen: boolean;
    pin: MapPin;
    onRequestClose: () => void;
    onCommit: () => void;
};

export function DeletePinModal({ isOpen, pin, onRequestClose, onCommit }: Props) {

    function handleSubmit() {
        if (!pin) return;
        onCommit();
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
            <section className={styles.header}>
                <h2 className={styles.title}>Delete pin</h2>
                <button
                    className={styles.closeButton}
                    onClick={onRequestClose}
                    aria-label="Close"
                >
                    ✕
                </button>
            </section>

            <section className={styles.content}>
                <p>Are you sure you want to delete the map pin "{pin.name}"?</p>
            </section>

            <section className={styles.actions}>
                <button
                    className={styles.cancelButton}
                    onClick={onRequestClose}
                >
                    Cancel
                </button>
                <button className={styles.submitButton} onClick={() => handleSubmit()}>
                    Yes
                </button>
            </section>
        </Modal>
    );
}
