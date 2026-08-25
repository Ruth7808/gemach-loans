import { useEffect, useState } from 'react';
import { checkHealth } from '../api';

export function DashboardPage() {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    checkHealth()
      .then(() => setConnected(true))
      .catch(() => setConnected(false));
  }, []);

  return (
    <div>
      <h1>דשבורד</h1>
      <p>
        {connected === null && 'בודק חיבור לשרת...'}
        {connected === true && 'מחובר לשרת'}
        {connected === false && 'אין חיבור לשרת'}
      </p>
    </div>
  );
}
