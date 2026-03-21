import { useState, useEffect } from 'preact/hooks';
import { Home } from './Home.jsx';
import { ApplicationDemo } from './demos/Application.jsx';
import { FollowUpDemo } from './demos/FollowUp.jsx';
import { ChoiceConnectDemo } from './demos/ChoiceConnect.jsx';
import { EmployeePortalDemo } from './demos/EmployeePortal.jsx';
import { UploadDocumentsDemo } from './demos/UploadDocuments.jsx';

const ROUTES = {
  '': Home,
  'application': ApplicationDemo,
  'follow-up': FollowUpDemo,
  'choice-connect': ChoiceConnectDemo,
  'employee-portal': EmployeePortalDemo,
  'upload-documents': UploadDocumentsDemo,
};

export function App() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '');

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.slice(1) || '');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const Component = ROUTES[route] || Home;
  return <Component />;
}
