const labels = {
  VIABLE: "Viable",
  NO_VIABLE: "No viable",
};

function DecisionBadge({ decision }) {
  const state = decision || "PENDIENTE";

  return (
    <span
      className={`adm-decision-badge adm-decision-badge--${state.toLowerCase()}`}
    >
      {labels[state] || "Pendiente"}
    </span>
  );
}

export default DecisionBadge;
