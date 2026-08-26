import { useParams } from 'react-router';

export function LoanDetailPage() {
  const { id } = useParams();

  return (
    <div>
      <h1>כרטיס הלוואה</h1>
      <p>הלוואה מספר {id} — המסך הזה בבנייה, יגיע בשלב הבא.</p>
    </div>
  );
}
