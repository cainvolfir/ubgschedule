import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: (
          <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
            <h2 className="text-2xl font-semibold">Welcome to UniSchedule</h2>
          </div>
        ),
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
