import React from "react";

interface VideoPanelProps {
  src?: string | null;
}

export default function VideoPanel({ src }: VideoPanelProps) {
  if (!src) {
    return <div style={{ padding: 20, color: "gray", fontStyle: "italic", textAlign: "center" }}>
      No video available
    </div>;
  }

  return (
    <video
      src={src}
      controls
      style={{
        width: "100%",
        maxHeight: 360,
        backgroundColor: "var(--bg-base)",
        borderRadius: 8,
        outline: "none"
      }}
    />
  );
}
