export default function Button({
  text,
  onClick,
  disable,
}: {
  text: string;
  onClick: React.MouseEventHandler;
  disable: boolean;
}) {
  return (
    <button
      className="bg-black p-3 rounded-3xl"
      onClick={onClick}
      disabled={disable}
    >
      {text}
    </button>
  );
}
