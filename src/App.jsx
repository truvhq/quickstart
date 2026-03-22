import { useState, useEffect } from 'preact/hooks';
import { Home } from './Home.jsx';
import { ApplicationDemo } from './demos/Application.jsx';
import { FollowUpDemo } from './demos/FollowUp.jsx';
import { ChoiceConnectDemo } from './demos/ChoiceConnect.jsx';
import { EmployeePortalDemo } from './demos/EmployeePortal.jsx';
import { UploadDocumentsDemo } from './demos/UploadDocuments.jsx';

const DEMOS = {
  'application': ApplicationDemo,
  'follow-up': FollowUpDemo,
  'choice-connect': ChoiceConnectDemo,
  'employee-portal': EmployeePortalDemo,
  'upload-documents': UploadDocumentsDemo,
};

function parseHash() {
  const hash = window.location.hash.slice(1); // e.g. "follow-up/bridge/income"
  const [demo, screen, ...rest] = hash.split('/');
  return { demo: demo || '', screen: screen || '', param: rest.join('/') || '' };
}

export function navigate(path) {
  window.location.hash = path;
}

export function App() {
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (!route.demo) return <Home />;

  const Component = DEMOS[route.demo];
  if (!Component) return <Home />;

  return <Component key={route.demo} screen={route.screen} param={route.param} />;
}
