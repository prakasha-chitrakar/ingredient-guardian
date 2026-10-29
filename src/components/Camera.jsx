import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

// Live camera for photographing a label. Calling getUserMedia is what makes the
// browser show its camera permission prompt. If the camera can't be used, we hand
// back to the caller so it can fall back to the phone's own camera/file picker.
export default function Camera({ onCapture, onClose, onUnavailable }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [state, setState] = useState('starting'); // starting | live | blocked | unavailable

  useEffect(() => {
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unavailable');
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        // Some browsers grant access but never deliver frames (a black screen).
        setTimeout(() => {
          if (!cancelled && !video.videoWidth) setState('unavailable');
        }, 3000);
        setState('live');
      })
      .catch(err => {
        if (cancelled) return;
        setState(err.name === 'NotAllowedError' || err.name === 'SecurityError' ? 'blocked' : 'unavailable');
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (blob) onCapture(new File([blob], 'label.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="camera" role="dialog" aria-modal="true" aria-label="Camera">
      <button className="camera__close" onClick={onClose} aria-label="Close camera"><X size={20} /></button>

      {state === 'blocked' || state === 'unavailable' ? (
        <div className="camera__blocked">
          <p className="h2">{state === 'blocked' ? 'Camera access blocked' : 'Camera isn’t available'}</p>
          <p>
            {state === 'blocked'
              ? 'Allow camera access in your browser settings, then try again.'
              : 'Or use your phone’s camera app.'}
          </p>
          <button className="btn btn--primary" onClick={onUnavailable}>Open camera</button>
        </div>
      ) : (
        <>
          <video ref={videoRef} className="camera__video" autoPlay playsInline muted />
          <p className="camera__hint">{state === 'live' ? 'Fit the full ingredient list in the frame.' : 'Opening camera…'}</p>
          <button className="camera__shutter" onClick={capture} disabled={state !== 'live'} aria-label="Take photo" />
        </>
      )}
    </div>
  );
}
