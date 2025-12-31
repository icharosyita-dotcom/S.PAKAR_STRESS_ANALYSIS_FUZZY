class StressDetector {
    constructor() {
        this.currentQuestion = 0;
        this.answers = {};
        this.scores = {};
        this.init();
    }

    init() {
        this.loadData();
        this.bindEvents();
    }

    async loadData() {
        const response = await fetch('data.json');
        this.data = await response.json();
        this.questions = this.data.questions;
    }

    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => this.showQuiz());
        document.getElementById('back-btn').addEventListener('click', () => this.showWelcome());
        document.getElementById('next-btn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());

        document.querySelectorAll('input[name="answer"]').forEach(radio => {
            radio.addEventListener('change', () => {
                document.getElementById('next-btn').disabled = false;
            });
        });
    }

    showQuiz() {
        document.getElementById('welcome-page').style.display = 'none';
        document.getElementById('quiz-page').style.display = 'flex';
        this.showQuestion();
    }

    showWelcome() {
        document.getElementById('quiz-page').style.display = 'none';
        document.getElementById('welcome-page').style.display = 'flex';
        this.currentQuestion = 0;
    }

    showQuestion() {
        if (this.currentQuestion >= this.questions.length) {
            this.showResults();
            return;
        }

        const q = this.questions[this.currentQuestion];
        document.getElementById('question-title').textContent = `Pertanyaan ${this.currentQuestion + 1}`;
        document.getElementById('question-text').innerHTML = q.text;

        document.querySelectorAll('input[name="answer"]').forEach(r => r.checked = false);
        document.getElementById('next-btn').disabled = true;

        this.updateProgress();
    }

    nextQuestion() {
        const selected = document.querySelector('input[name="answer"]:checked');
        if (!selected) return;

        const q = this.questions[this.currentQuestion];
        this.answers[q.id] = parseInt(selected.value);
        this.currentQuestion++;
        this.showQuestion();
    }

    updateProgress() {
        const progress = ((this.currentQuestion + 1) / this.questions.length) * 100;
        document.getElementById('progress-fill').style.width = progress + '%';
        document.getElementById('progress-text').textContent =
            `${this.currentQuestion + 1}/${this.questions.length}`;
    }

    showResults() {
        document.getElementById('quiz-page').style.display = 'none';
        document.getElementById('result-page').style.display = 'flex';
        this.calculateScores();
        this.renderResults();
    }

    // ================== HITUNG SKOR ==================
    calculateScores() {
        this.scores = {};
        Object.keys(this.data.aspects).forEach(a => this.scores[a] = 0);

        Object.entries(this.answers).forEach(([id, jawaban]) => {
            const aspek = this.questions.find(q => q.id === id).aspect;
            const bobot = this.data.weights[id];
            this.scores[aspek] += jawaban * bobot;
        });
    }

    // ================== FUZZY LOGIC ==================
    fuzzifikasi(x) {
        return {
            rendah: x <= 30 ? 1 :
                    x > 30 && x < 50 ? (50 - x) / 20 : 0,
            sedang: x > 30 && x < 50 ? (x - 30) / 20 :
                    x >= 50 && x < 70 ? (70 - x) / 20 : 0,
            tinggi: x >= 70 ? 1 :
                    x >= 50 && x < 70 ? (x - 50) / 20 : 0
        };
    }

    inferensi(fuzzyScores) {
        let hasil = [];
        Object.values(fuzzyScores).forEach(fz => {
            hasil.push(fz.rendah * 30);
            hasil.push(fz.sedang * 60);
            hasil.push(fz.tinggi * 90);
        });
        return hasil;
    }

    defuzzifikasi(values) {
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    calculateFuzzyStress() {
    let nilaiAkhir = [];

    Object.values(this.scores).forEach(score => {
        const fz = this.fuzzifikasi(score);

        // aturan Mamdani
        nilaiAkhir.push(
            fz.rendah * 30,
            fz.sedang * 60,
            fz.tinggi * 90
        );
    });

    // ambil nilai maksimum (dominasi stres)
    return Math.max(...nilaiAkhir);
}


    // ================== OUTPUT ==================
    renderResults() {
        let html = '';
        const sorted = Object.entries(this.scores)
            .map(([a, s]) => ({ a, s, n: this.data.aspects[a] }))
            .sort((x, y) => y.s - x.s);

        sorted.forEach(({ a, s, n }) => {
            html += `
                <div class="result-item">
                    <span><b>${n}</b></span>
                    <span>${s} - ${this.getStressLevel(s)}</span>
                </div>`;
        });

        const fuzzyScore = this.calculateFuzzyStress();
        html += `
            <hr>
            <div class="result-item">
                <span><b>Hasil Akhir (Fuzzy Mamdani)</b></span>
                <span>${fuzzyScore.toFixed(2)} - ${this.getStressLevel(fuzzyScore)}</span>
            </div>`;

        document.getElementById('result-details').innerHTML = html;
        this.renderChart(sorted);
    }

    getStressLevel(s) {
        if (s >= 80) return 'Sangat Tinggi';
        if (s >= 60) return 'Tinggi';
        if (s >= 40) return 'Sedang';
        if (s >= 20) return 'Rendah';
        return 'Sangat Rendah';
    }

    renderChart(data) {
        const ctx = document.getElementById('result-chart');
        if (window.chart) window.chart.destroy();

        window.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.n),
                datasets: [{
                    data: data.map(d => d.s),
                    backgroundColor: '#4f46e5',
                    borderRadius: 8
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    restart() {
        document.getElementById('result-page').style.display = 'none';
        this.showWelcome();
        this.answers = {};
        this.scores = {};
        this.currentQuestion = 0;
        if (window.chart) window.chart.destroy();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new StressDetector();
});
