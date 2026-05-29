import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
      <h2 className="text-2xl font-semibold">{title}</h2>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Placeholder title="Welcome to UniSchedule" /> },
      { path: '/upload-krs', element: <Placeholder title="Upload KRS (Study Plan)" /> },
      { path: '/upload-teori', element: <Placeholder title="Upload Theory Schedule" /> },
      { path: '/select-class', element: <Placeholder title="Select Classes" /> },
      { path: '/upload-praktikum', element: <Placeholder title="Upload Practical Schedule" /> },
      { path: '/result', element: <Placeholder title="Final Schedule" /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
