export function StatCard(label, value) {
  return `
    <div class="stat-card">
      <p class="stat-label">${label}</p>
      <h3 class="stat-value">${value}</h3>
    </div>
  `;
}