import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { UploadKrsPage } from './features/schedule/UploadKrsPage';
import { UploadTeoriPage } from './features/schedule/UploadTeoriPage';
import { SelectClassPage } from './features/schedule/SelectClassPage';
import { UploadPraktikumPage } from './features/schedule/UploadPraktikumPage';
import { ResultPage } from './features/schedule/ResultPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<UploadKrsPage />} />
          <Route path="/upload-teori" element={<UploadTeoriPage />} />
          <Route path="/select-class" element={<SelectClassPage />} />
          <Route path="/upload-praktikum" element={<UploadPraktikumPage />} />
          <Route path="/result" element={<ResultPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
