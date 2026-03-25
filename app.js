
// Seating Chart Generator
document.addEventListener('DOMContentLoaded', () => {
	const rowsInput = document.getElementById('rows');
	const colsInput = document.getElementById('cols');
	const podInput = document.getElementById('podSize');
	const goBtn = document.getElementById('go');
	const sortBtn = document.getElementById('sort');
	const shuffleBtn = document.getElementById('shuffle');
	const printBtn = document.getElementById('print');
	const namesInput = document.getElementById('names');
	const ignoreEmpty = document.getElementById('ignoreEmpty');
	const chart = document.getElementById('chart');

	let seats = [];

	function parseNames() {
		const raw = namesInput.value || '';
		if (!raw.trim()) return [];
		// split on commas, newlines, or semicolons
		const parts = raw.split(/[,;\n]/).map(s => s.trim());
		return parts.filter(s => (ignoreEmpty.checked ? s.length > 0 : true));
	}

	function autoExpandLayout(required, rows, cols) {
		rows = Math.min(Math.max(1, rows), 8);
		cols = Math.min(Math.max(1, cols), 8);
		while (rows * cols < required && (rows < 8 || cols < 8)) {
			if (cols < 8) cols++;
			else if (rows < 8) rows++;
		}
		return { rows, cols };
	}

	function generateSeats(names, rows, cols) {
		const total = rows * cols;
		seats = new Array(total).fill('').map((_, i) => names[i] || '');
	}

	function applyPodGaps(el, idx, cols, podSize) {
		const col = idx % cols;
		const row = Math.floor(idx / cols);
		// reset margins
		el.style.marginLeft = '';
		el.style.marginTop = '';
		if (podSize > 1) {
			if (col % podSize === 0 && col !== 0) el.style.marginLeft = '12px';
			if (row % podSize === 0 && row !== 0) el.style.marginTop = '12px';
		}
	}

	function renderChart(rows, cols, podSize) {
		chart.innerHTML = '';
		chart.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
		seats.forEach((name, i) => {
			const seat = document.createElement('div');
			seat.className = 'seat';
			seat.setAttribute('draggable', true);
			seat.dataset.index = i;

			const span = document.createElement('span');
			span.className = 'name';
			span.textContent = name;
			seat.appendChild(span);

			applyPodGaps(seat, i, cols, podSize);

			// drag & drop handlers
			seat.addEventListener('dragstart', (e) => {
				e.dataTransfer.setData('text/plain', i);
				seat.classList.add('dragging');
			});
			seat.addEventListener('dragend', () => {
				seat.classList.remove('dragging');
			});
			seat.addEventListener('dragover', (e) => {
				e.preventDefault();
				seat.classList.add('drag-over');
			});
			seat.addEventListener('dragleave', () => {
				seat.classList.remove('drag-over');
			});
			seat.addEventListener('drop', (e) => {
				e.preventDefault();
				seat.classList.remove('drag-over');
				const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
				const toIdx = i;
				if (!Number.isNaN(fromIdx) && fromIdx !== toIdx) {
					const tmp = seats[fromIdx];
					seats[fromIdx] = seats[toIdx];
					seats[toIdx] = tmp;
					renderChart(rows, cols, podSize);
				}
			});

			chart.appendChild(seat);
		});
		// after render adjust font sizes
		requestAnimationFrame(adjustFontSizes);
	}

	function adjustFontSizes() {
		const seatEls = Array.from(chart.querySelectorAll('.seat .name'));
		seatEls.forEach(el => {
			el.style.fontSize = '';
			let fs = 18; // start
			el.style.whiteSpace = 'nowrap';
			const parent = el.parentElement;
			while (fs > 10) {
				el.style.fontSize = fs + 'px';
				if (el.scrollWidth <= parent.clientWidth - 8) break;
				fs -= 1;
			}
			el.style.whiteSpace = 'normal';
		});
	}

	function sortSeats() {
		const namesOnly = seats.filter(Boolean).slice();
		namesOnly.sort((a,b)=>a.localeCompare(b));
		// keep empty seats at end
		for (let i=0;i<seats.length;i++) seats[i] = namesOnly[i] || '';
	}

	function shuffleSeats() {
		for (let i = seats.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[seats[i], seats[j]] = [seats[j], seats[i]];
		}
	}

	function doGo() {
		const names = parseNames();
		if (names.length === 0) {
			seats = [];
			renderChart(parseInt(rowsInput.value,10), parseInt(colsInput.value,10), parseInt(podInput.value,10));
			return;
		}
		// ensure layout big enough (cap at 8x8)
		let rows = parseInt(rowsInput.value, 10) || 1;
		let cols = parseInt(colsInput.value, 10) || 1;
		const { rows: r2, cols: c2 } = autoExpandLayout(names.length, rows, cols);
		rows = r2; cols = c2;
		rowsInput.value = rows; colsInput.value = cols;

		generateSeats(names, rows, cols);
		renderChart(rows, cols, parseInt(podInput.value,10));
	}

	function doPrint() {
		// open a new window with only the chart
		const w = window.open('', '_blank');
		if (!w) return alert('Popup blocked: allow popups to use print.');
		const style = `<style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;padding:10px} .chart{display:grid;grid-template-columns:${chart.style.gridTemplateColumns};grid-auto-rows:80px;gap:8px} .seat{border:1px solid #cfd8d7;background:#f7f7f7;border-radius:6px;display:flex;align-items:center;justify-content:center;padding:6px;}</style>`;
		w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print</title>${style}</head><body><div class="chart">${chart.innerHTML}</div><script>setTimeout(()=>{window.print();},200);</script></body></html>`);
		w.document.close();
	}

	// wire up buttons
	goBtn.addEventListener('click', doGo);
	sortBtn.addEventListener('click', () => { sortSeats(); renderChart(parseInt(rowsInput.value,10), parseInt(colsInput.value,10), parseInt(podInput.value,10)); });
	shuffleBtn.addEventListener('click', () => { shuffleSeats(); renderChart(parseInt(rowsInput.value,10), parseInt(colsInput.value,10), parseInt(podInput.value,10)); });
	printBtn.addEventListener('click', doPrint);

	// initial render
	// prefill example names for convenience
	if (!namesInput.value.trim()) {
		namesInput.value = 'Alice, Bob, Charlie, Denise, Eric, Fiona, George, Hannah';
	}
	doGo();
});
