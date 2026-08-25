import { useParams } from 'react-router';

export function BorrowerDetailPage() {
  const { id } = useParams();

  return (
    <div>
      <h1>כרטיס לווה</h1>
      <p>לווה מספר {id} — המסך הזה בבנייה, יגיע בשלב הבא.</p>
    </div>
  );
}
