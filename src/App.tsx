import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { UploadKrsPage } from './features/schedule/UploadKrsPage';
import { UploadTeoriPage } from './features/schedule/UploadTeoriPage';
import { SelectClassPage } from './features/schedule/SelectClassPage';
import { UploadPraktikumPage } from './features/schedule/UploadPraktikumPage';

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center px-3">
      <h2 className="pixel-font text-center text-[10px] text-zinc-400">{title}</h2>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<UploadKrsPage />} />
          <Route path="/upload-teori" element={<UploadTeoriPage />} />
          <Route path="/select-class" element={<SelectClassPage />} />
          <Route path="/upload-praktikum" element={<UploadPraktikumPage />} />
          <Route path="/result" element={<Placeholder title="Final Schedule" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
