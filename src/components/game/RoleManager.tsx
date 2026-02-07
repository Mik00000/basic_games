"use client";

import type React from "react";
import { useState } from "react";
import type { RolePermissions } from "../../types/gameTypes";

interface RoleManagerProps {
  rolePermissions: Record<string, RolePermissions>;
  currentUserRole: string;
  canManageRoles: boolean;
  onUpdateRole: (
    role: string,
    permissions: Partial<RolePermissions>,
  ) => Promise<void>;
}

export const RoleManager: React.FC<RoleManagerProps> = ({
  rolePermissions,
  currentUserRole,
  canManageRoles,
  onUpdateRole,
}) => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  const permissionLabels: Record<keyof RolePermissions, string> = {
    canPlay: "Can Play Game",
    canChat: "Can Send Messages",
    canUndo: "Can Undo Moves",
    canRedo: "Can Redo Moves",
    canKickPlayers: "Can Kick Players",
    canChangeSettings: "Can Change Settings",
    canTransferAdmin: "Can Transfer Admin",
    canViewGameState: "Can View Game State",
    canSpectate: "Can Spectate",
  };

  const handlePermissionChange = async (
    permission: keyof RolePermissions,
    value: boolean,
  ) => {
    if (!selectedRole || !canManageRoles) return;

    try {
      await onUpdateRole(selectedRole, { [permission]: value });
    } catch (error) {
      console.error("Failed to update permission:", error);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim() || !canManageRoles) return;

    const defaultPermissions: RolePermissions = {
      canPlay: false,
      canChat: true,
      canUndo: false,
      canRedo: false,
      canKickPlayers: false,
      canChangeSettings: false,
      canTransferAdmin: false,
      canViewGameState: true,
      canSpectate: true,
    };

    try {
      await onUpdateRole(newRoleName.trim(), defaultPermissions);
      setNewRoleName("");
      setIsCreatingRole(false);
      setSelectedRole(newRoleName.trim());
    } catch (error) {
      console.error("Failed to create role:", error);
    }
  };

  const getRoleColor = (role: string): React.CSSProperties => {
    switch (role) {
      case "admin":
        return { color: "red" };
      case "player":
        return { color: "blue" };
      case "spectator":
        return { color: "gray" };
      default:
        return { color: "purple" };
    }
  };

  const isBaseRole = (role: string) =>
    ["admin", "player", "spectator"].includes(role);

  if (!canManageRoles) {
    return (
      <div className="card">
        <h3>⚙️ Role Information</h3>
        <p>Your current role:</p>
        <span style={getRoleColor(currentUserRole)}>{currentUserRole}</span>
        <div style={{ marginTop: "1rem" }}>
          <p>Your permissions:</p>
          <ul>
            {Object.entries(rolePermissions[currentUserRole] || {}).map(
              ([permission, hasPermission]) => (
                <li key={permission}>
                  {permissionLabels[permission as keyof RolePermissions] ||
                    permission}
                  : <strong>{hasPermission ? "Yes" : "No"}</strong>
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>⚙️ Role Management</h3>

      <div>
        <label>Available Roles:</label>
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginTop: "8px",
          }}
        >
          {Object.keys(rolePermissions).map((role) => (
            <button
              key={role}
              style={{
                padding: "4px 8px",
                border:
                  selectedRole === role ? "2px solid black" : "1px solid gray",
              }}
              onClick={() => setSelectedRole(role)}
            >
              <span style={getRoleColor(role)}>{role}</span>{" "}
              {isBaseRole(role) && <small>(Base)</small>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>
        {isCreatingRole ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              placeholder="Role name"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button onClick={handleCreateRole}>Create</button>
            <button onClick={() => setIsCreatingRole(false)}>Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreatingRole(true)}
            style={{ width: "100%" }}
          >
            ➕ Create Custom Role
          </button>
        )}
      </div>

      <hr />

      {selectedRole && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label>
              Permissions for{" "}
              <span style={getRoleColor(selectedRole)}>{selectedRole}</span>
            </label>
            {!isBaseRole(selectedRole) && (
              <button
                onClick={() => {
                  console.log("Delete role:", selectedRole);
                }}
                style={{ color: "red" }}
              >
                🗑️ Delete
              </button>
            )}
          </div>

          <div
            style={{ maxHeight: "250px", overflowY: "auto", marginTop: "1rem" }}
          >
            {Object.entries(rolePermissions[selectedRole] || {}).map(
              ([permission, hasPermission]) => (
                <div
                  key={permission}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <label htmlFor={`${selectedRole}-${permission}`}>
                    {permissionLabels[permission as keyof RolePermissions] ||
                      permission}
                  </label>
                  <input
                    type="checkbox"
                    id={`${selectedRole}-${permission}`}
                    checked={hasPermission}
                    onChange={(e) =>
                      handlePermissionChange(
                        permission as keyof RolePermissions,
                        e.target.checked,
                      )
                    }
                  />
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
};
