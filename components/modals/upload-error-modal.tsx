"use client";

interface UploadErrorModalProps {
  message: string;
  confirm: () => void;
}

export function UploadErrorModal({ message, confirm }: UploadErrorModalProps) {
  return (
    <div className="overlay" role="alertdialog" aria-modal="true" aria-labelledby="upload-error-title">
      <div className="upload-error-modal">
        <h2 id="upload-error-title">上传失败</h2>
        <p>{message}</p>
        <button className="primary-btn" onClick={confirm} autoFocus>确认</button>
      </div>
    </div>
  );
}
