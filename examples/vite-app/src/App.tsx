import { MapExplorer, useMapPins, type MapPin } from "map-explorer";
import { useCallback, useEffect, useRef, useState } from "react";

import styles from  "./App.module.css";
import Modal from "react-modal";

type ModalType = "EDIT";

export function App() {
    const pins = useMapPins();
    const [useCustomHandlers, setUseCustomHandlers] = useState(false);
    const [openedModal, setOpenedModal] = useState<ModalType|null>(null);
    const [selectedPin, setSelectedPin] = useState<MapPin|null>(null);

    const modalResolverRef = useRef<((value: MapPin|null) => void) | null>(null);
    const nameRef = useRef<HTMLInputElement|null>(null);

    const onSave = useCallback(() => {
        console.log(pins);
    }, [pins]);

    const onEditPin = useCallback(async (pin: MapPin) => {
        setSelectedPin(pin);
        setOpenedModal("EDIT");

        const result = await new Promise<MapPin | null>(resolve => {
            modalResolverRef.current = resolve;
        });

        return result;
    }, []);

    const handleModalClose = useCallback((submit: boolean) => {
        setOpenedModal(null);
        if (submit) {
            modalResolverRef.current?.({
                ...selectedPin!,
                name: nameRef.current!.value
            });
        }
        else {
            modalResolverRef.current?.(null);
        }
        modalResolverRef.current = null;
    }, [selectedPin]);

    useEffect(() => {
        if (!nameRef.current) return;
        nameRef.current!.value = selectedPin?.name ?? "";
    }, [selectedPin]);

    return (
        <div className={styles.appContainer}>
            <MapExplorer
                image="/Tayira.webp"
                resize="both"
                onEditPin={useCustomHandlers ? onEditPin : undefined}
                onClickPin={pin => alert(JSON.stringify(pin))}
            />
            <br></br>
            <div className={styles.row}>
                <button onClick={onSave}>Save</button>
                <label>
                    Use custom handlers?
                    <input
                        type="checkbox"
                        checked={useCustomHandlers}
                        onChange={e => setUseCustomHandlers(e.target.checked)}
                    />
                </label>
            </div>
            <Modal
                isOpen={openedModal === "EDIT"}
                onRequestClose={() => handleModalClose(false)}
                className={styles.modalContainer}
                overlayClassName={styles.modalOverlay}
            >
                <div>
                    <section className={styles.modalHeader}>
                        <b>Edit Pin</b>
                    </section>
                    <br></br>
                    <section>
                        <div className={styles.field}>
                            <label htmlFor="pin-name">
                                Name
                            </label>
                            <input
                                id="pin-name"
                                ref={nameRef}
                                placeholder="Pin name"
                                required
                            />
                        </div>
                    </section>
                    <br></br>
                    <section className={styles.modalFooter}>
                        <button onClick={() => handleModalClose(true)}>Submit</button>
                        <button onClick={() => handleModalClose(false)}>Cancel</button>
                    </section>
                </div>
            </Modal>
        </div>
    )
}

Modal.setAppElement(document.getElementById("root")!);
