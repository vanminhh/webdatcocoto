/* ═══════════════════════════════════════
   DASHBOARD.JS — Charts & Stats
   Theme: Toyota Red-Black
   ═══════════════════════════════════════ */

async function loadDashboardChart() {
    try {
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/dashboard/monthly-stats', { headers });
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();

        const { cards, charts } = data;

        const formatVND = (amount) => {
            if (amount >= 1e9) return (amount / 1e9).toFixed(1) + ' Tỷ';
            if (amount >= 1e6) return (amount / 1e6).toFixed(0) + ' Tr';
            return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
        };

        const el = (id) => document.getElementById(id);
        if (el('stat-total-cars')) el('stat-total-cars').textContent = cards.totalCars || 0;
        if (el('stat-orders')) el('stat-orders').textContent = cards.orders || 0;
        if (el('stat-customers')) el('stat-customers').textContent = cards.customers || 0;
        if (el('stat-deposits')) el('stat-deposits').textContent = formatVND(cards.depositsAmount || 0);
        if (el('stat-revenue')) el('stat-revenue').textContent = formatVND(cards.revenue || 0);

        // ── Pie Chart: Phân bổ dòng xe ──
        const carsCtx = document.getElementById("topSellingCarsChart");
        if (carsCtx && charts.carTypeDistribution) {
            const typeLabels = charts.carTypeDistribution.map(c => c._id);
            const typeData = charts.carTypeDistribution.map(c => c.count);
            const colors = ["#EB0A1E", "#F59E0B", "#3B82F6", "#22C55E", "#A855F7", "#EC4899", "#06B6D4"];

            // Destroy old chart if exists
            let chartInstance = Chart.getChart(carsCtx);
            if (chartInstance) chartInstance.destroy();

            new Chart(carsCtx, {
                type: "doughnut",
                data: {
                    labels: typeLabels.length > 0 ? typeLabels : ["SUV", "Sedan", "Truck", "MPV"],
                    datasets: [{
                        data: typeData.length > 0 ? typeData : [10, 8, 5, 7],
                        backgroundColor: colors.slice(0, typeLabels.length || 4),
                        borderColor: "#222222",
                        borderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    cutout: '60%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: "#AAAAAA", padding: 16, font: { family: "'Be Vietnam Pro'", size: 12 } }
                        }
                    }
                }
            });
        }

        // ── Bar Chart: Top xe quan tâm ──
        const barCtx = document.getElementById("topCarsBarChart");
        if (barCtx && charts.topInterestedCars) {
            const barLabels = charts.topInterestedCars.map(c => c.carName);
            const barData = charts.topInterestedCars.map(c => c.count);
            const barColors = barData.map((_, i) => `rgba(235, 10, 30, ${0.9 - (i * 0.08)})`);

            let chartInstance = Chart.getChart(barCtx);
            if (chartInstance) chartInstance.destroy();

            new Chart(barCtx, {
                type: "bar",
                data: {
                    labels: barLabels.length > 0 ? barLabels : ["Chưa có dữ liệu"],
                    datasets: [{
                        label: "Số lượt quan tâm",
                        data: barData.length > 0 ? barData : [0],
                        backgroundColor: barColors.length > 0 ? barColors : ["rgba(235,10,30,0.8)"],
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            ticks: { color: "#AAAAAA", font: { family: "'Be Vietnam Pro'" } },
                            grid: { display: false }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: { color: "#AAAAAA", stepSize: 1, font: { family: "'Be Vietnam Pro'" } },
                            grid: { color: "rgba(255,255,255,0.05)" }
                        }
                    }
                }
            });
        }

        // ── Line Chart: Đơn hàng & Đặt cọc theo tháng ──
        const salesCtx = document.getElementById("salesChart");
        if (salesCtx && charts.ordersByMonth && charts.depositsByMonth) {
            const monthLabels = charts.ordersByMonth.map(m => {
                const parts = m.key.split('-');
                return `T${parts[1]}`;
            });
            const ordersData = charts.ordersByMonth.map(m => m.count);
            const depositsData = charts.depositsByMonth.map(m => m.count);

            let chartInstance = Chart.getChart(salesCtx);
            if (chartInstance) chartInstance.destroy();

            new Chart(salesCtx, {
                type: "line",
                data: {
                    labels: monthLabels,
                    datasets: [
                        {
                            label: "Đơn hàng",
                            data: ordersData,
                            backgroundColor: "rgba(235, 10, 30, 0.1)",
                            borderColor: "#EB0A1E",
                            borderWidth: 3,
                            pointBackgroundColor: "#fff",
                            pointBorderColor: "#EB0A1E",
                            pointBorderWidth: 2,
                            pointRadius: 5,
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: "Đã đặt cọc",
                            data: depositsData,
                            backgroundColor: "rgba(245, 166, 35, 0.1)",
                            borderColor: "#F5A623",
                            borderWidth: 3,
                            pointBackgroundColor: "#fff",
                            pointBorderColor: "#F5A623",
                            pointBorderWidth: 2,
                            pointRadius: 5,
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: { color: "#AAAAAA", font: { family: "'Be Vietnam Pro'", weight: "500" } }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: "#AAAAAA", font: { family: "'Be Vietnam Pro'" } },
                            grid: { color: "rgba(255,255,255,0.05)" }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: { color: "#AAAAAA", stepSize: 5, font: { family: "'Be Vietnam Pro'" } },
                            grid: { color: "rgba(255,255,255,0.05)" }
                        }
                    }
                }
            });
        }
    } catch (e) {
        console.error('Stats fetch error:', e);
        const el = (id) => document.getElementById(id);
        if (el('stat-total-cars')) el('stat-total-cars').textContent = '--';
        if (el('stat-orders')) el('stat-orders').textContent = '--';
        if (el('stat-customers')) el('stat-customers').textContent = '--';
        if (el('stat-deposits')) el('stat-deposits').textContent = '--';
        if (el('stat-revenue')) el('stat-revenue').textContent = '--';
    }
}
