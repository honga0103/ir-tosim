"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: "#24AF64",
        color: "white",
        border: "none",
        padding: "6px 18px",
        borderRadius: "6px",
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
