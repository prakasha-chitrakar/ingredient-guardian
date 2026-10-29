import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ImageUp, Keyboard, LoaderCircle, TriangleAlert, X } from 'lucide-react';
import CameraView from './Camera';
import { PRODUCT_TYPES, prepareImage } from '../lib';

const STEPS = ['Reading…', 'Checking…', 'Almost done…'];

// Phones and tablets use their own camera app (a capture file input): it works in every
// mobile browser, including iOS Brave/Chrome/Firefox, which can't stream the camera to
// websites. The in-page live camera is only used on laptops and desktops.
const USE_NATIVE_CAMERA = navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches;

export default function Scan({ profile, onResult, initialMode = 'photo' }) {
  const [mode, setMode] = useState(initialMode);
  const [cameraOpen, setCameraOpen] = useState(false);
  const captureRef = useRef(null);
  const [productType, setProductType] = useState('Food');
  const [productName, setProductName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 2200);
    return () => clearInterval(id);
  }, [loading]);

  const pickFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Choose a photo (JPEG or PNG).'); return; }
    try {
      setError('');
      setImage(await prepareImage(file));
    } catch (e) {
      setError(e.message);
    }
  };

  // No live camera (old browser, desktop without webcam): use the phone's own camera app.
  const cameraUnavailable = useCallback(() => {
    setCameraOpen(false);
    captureRef.current?.click();
  }, []);

  const analyze = async () => {
    if (mode === 'text' && !ingredients.trim()) { setError('Add ingredients first.'); return; }
    if (mode === 'photo' && !image) { setError('Add a photo first.'); return; }

    setError('');
    setStep(0);
    setLoading(true);
    try {
      const body = { productType, productName, profile };
      if (mode === 'photo') body.image = { mediaType: image.mediaType, data: image.base64 };
      else body.ingredients = ingredients;

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `The server returned an error (${res.status}).`);

      onResult({
        ...data,
        scannedAt: new Date().toISOString(),
        ...(mode === 'photo' ? { preview: image.preview, thumb: image.thumb } : {}),
      });
    } catch (e) {
      setError(e.message === 'Failed to fetch' ? 'No connection. Try again.' : e.message);
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <h1 className="h1"><span className="tone-orange">Check</span> a label</h1>

      <div className="seg" role="tablist" aria-label="How to add ingredients">
        <button role="tab" aria-selected={mode === 'photo'} className={mode === 'photo' ? 'is-active' : ''} onClick={() => setMode('photo')}>
          <Camera size={17} /> Photo
        </button>
        <button role="tab" aria-selected={mode === 'text'} className={mode === 'text' ? 'is-active' : ''} onClick={() => setMode('text')}>
          <Keyboard size={17} /> Type or paste
        </button>
      </div>

      {mode === 'photo' ? (
        image ? (
          <div className="photo">
            <img src={image.preview} alt="Ingredient label to check" />
            <button className="photo__remove" onClick={() => setImage(null)} aria-label="Remove photo"><X size={16} /></button>
          </div>
        ) : (
          <div
            className="drop"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); }}
          >
            <span className="drop__title">Snap the label</span>
            <span className="drop__hint">Whole list, good light.</span>
            <div className="drop__actions">
              <button className="btn btn--primary" onClick={() => (USE_NATIVE_CAMERA ? captureRef.current?.click() : setCameraOpen(true))}>
                <Camera size={18} /> Take photo
              </button>
              <button className="btn btn--ghost" onClick={() => fileRef.current?.click()}><ImageUp size={18} /> Gallery</button>
            </div>
          </div>
        )
      ) : (
        <label className="field">
          <span className="label">Ingredient list</span>
          <textarea
            className="input"
            rows={7}
            value={ingredients}
            onChange={e => setIngredients(e.target.value)}
            placeholder="Water, sugar, citric acid, sodium benzoate, natural flavours…"
          />
        </label>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { pickFile(e.target.files[0]); e.target.value = ''; }} />
      <input ref={captureRef} type="file" accept="image/*" capture="environment" hidden onChange={e => { pickFile(e.target.files[0]); e.target.value = ''; }} />
      {cameraOpen && (
        <CameraView
          onCapture={file => { setCameraOpen(false); pickFile(file); }}
          onClose={() => setCameraOpen(false)}
          onUnavailable={cameraUnavailable}
        />
      )}

      <div className="field-row">
        <label className="field">
          <span className="label">Product type</span>
          <select className="input" value={productType} onChange={e => setProductType(e.target.value)}>
            {PRODUCT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="label">Name <span className="label__opt">optional</span></span>
          <input className="input" value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Wai Wai" />
        </label>
      </div>

      <p className="profile-note">
        Checking for <b>{profile.type}</b>
        {profile.allergies.length > 0 && <> · allergic to {profile.allergies.join(', ').toLowerCase()}</>}
      </p>

      {error && (
        <div className="alert" role="alert">
          <TriangleAlert size={18} />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="loading" aria-live="polite">
          <LoaderCircle size={20} className="spin" />
          {STEPS[step]}
        </div>
      ) : (
        <button className="btn btn--primary btn--block" onClick={analyze}>Check</button>
      )}
    </div>
  );
}
