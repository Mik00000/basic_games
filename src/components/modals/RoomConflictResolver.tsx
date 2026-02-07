import React from "react";
import { Modal } from "./Modal";

interface RoomConflictResolverProps {
  conflictRoomId: string;
  onResolve: (action: "stay" | "leave") => void;
}

export const RoomConflictResolver: React.FC<RoomConflictResolverProps> = ({
  conflictRoomId,
  onResolve,
}) => {
  return (
    <Modal
      isOpen={true}
      title="Already in a Room"
      actions={
        <>
          <button className="secondary" onClick={() => onResolve("stay")}>
            Return to Old Room
          </button>
          <button className="primary" onClick={() => onResolve("leave")}>
            Leave & Join New
          </button>
        </>
      }
    >
      <p>
        You are already in another room (<strong>{conflictRoomId}</strong>).
      </p>
      <p>Do you want to leave it and join this one?</p>
    </Modal>
  );
};
