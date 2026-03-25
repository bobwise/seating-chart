
// Seating Chart Generator — pods model
document.addEventListener('DOMContentLoaded', () => {
	const rowsInput = document.getElementById('rows');
	const colsInput = document.getElementById('cols');
	const podInput = document.getElementById('podSize');
	const goBtn = document.getElementById('go');
	const sortBtn = document.getElementById('sort');
	const shuffleBtn = document.getElementById('shuffle');
	const printBtn = document.getElementById('print');
	const namesInput = document.getElementById('names');
	const chart = document.getElementById('chart');

	// pods: array of { desks: [name, ...] }
	let pods = [];

	function parseNames() {
		const raw = namesInput.value || '';
		if (!raw.trim()) return [];
		// split on commas, newlines, or semicolons, keep empties
		return raw.split(/[,;\n]/).map(s => s.trim());
	}

	function autoExpandLayout(required, rows, cols, podSize) {
		rows = Math.min(Math.max(1, rows), 8);
		cols = Math.min(Math.max(1, cols), 8);
		podSize = Math.max(1, podSize || 1);
		while (rows * cols * podSize < required && (rows < 8 || cols < 8)) {
			if (cols < 8) cols++;
			else if (rows < 8) rows++;
		}
		return { rows, cols };
	}

	function generatePods(names, rows, cols, podSize) {
		const totalDesks = rows * cols * podSize;
		const flat = new Array(totalDesks).fill('').map((_, i) => names[i] || '');
		pods = [];
		for (let p = 0; p < rows * cols; p++) {
			const start = p * podSize;
			pods.push({ desks: flat.slice(start, start + podSize) });
		}
	}

	function applyPodGaps(el, idx, cols, podSize) {
		const col = idx % cols;
		const row = Math.floor(idx / cols);
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
		pods.forEach((pod, podIndex) => {
			const cellEl = document.createElement('div');
			cellEl.className = 'seat';

			const podEl = document.createElement('div');
			podEl.className = 'pod';

			pod.desks.forEach((name, deskIndex) => {
				const desk = document.createElement('div');
				desk.className = 'desk';

				const seatInner = document.createElement('div');
				seatInner.className = 'desk-seat';
				seatInner.setAttribute('draggable', true);
				seatInner.dataset.pod = podIndex;
				seatInner.dataset.desk = deskIndex;

				const span = document.createElement('span');
				span.className = 'name';
				span.textContent = name || '';
				seatInner.appendChild(span);

				seatInner.addEventListener('dragstart', (e) => {
					e.dataTransfer.setData('text/plain', `${podIndex}:${deskIndex}`);
					seatInner.classList.add('dragging');
				});
				seatInner.addEventListener('dragend', () => {
					seatInner.classList.remove('dragging');
				});
				seatInner.addEventListener('dragover', (e) => {
					e.preventDefault();
					seatInner.classList.add('drag-over');
				});
				seatInner.addEventListener('dragleave', () => {
					seatInner.classList.remove('drag-over');
				});
				seatInner.addEventListener('drop', (e) => {
					e.preventDefault();
					seatInner.classList.remove('drag-over');
					const data = e.dataTransfer.getData('text/plain');
					const parts = data.split(':').map(Number);
					const fromPod = parts[0];
					const fromDesk = parts[1];
					const toPod = podIndex;
					const toDesk = deskIndex;
					if (!Number.isNaN(fromPod) && !Number.isNaN(fromDesk) && (fromPod !== toPod || fromDesk !== toDesk)) {
						const tmp = pods[fromPod].desks[fromDesk];
						pods[fromPod].desks[fromDesk] = pods[toPod].desks[toDesk];
						pods[toPod].desks[toDesk] = tmp;
						renderChart(rows, cols, podSize);
					}
				});

				desk.appendChild(seatInner);
				podEl.appendChild(desk);
			});

			cellEl.appendChild(podEl);
			applyPodGaps(cellEl, podIndex, cols, podSize);
			chart.appendChild(cellEl);
		});

		requestAnimationFrame(adjustFontSizes);
	}

	function adjustFontSizes() {
		const seatEls = Array.from(chart.querySelectorAll('.desk-seat .name'));
		seatEls.forEach(el => {
			el.style.fontSize = '';
			let fs = 18;
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
		const flat = pods.flatMap(p => p.desks).filter(Boolean).slice();
		flat.sort((a, b) => a.localeCompare(b));
		const total = pods.reduce((acc, p) => acc + p.desks.length, 0);
		const filled = [];
		for (let i = 0; i < total; i++) filled[i] = flat[i] || '';
		// reassign
		let k = 0;
		pods.forEach(p => {
			for (let i = 0; i < p.desks.length; i++) p.desks[i] = filled[k++] || '';
		});
	}

	function shuffleSeats() {
		const flat = pods.flatMap(p => p.desks);
		for (let i = flat.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[flat[i], flat[j]] = [flat[j], flat[i]];
		}
		let k = 0;
		pods.forEach(p => {
			for (let i = 0; i < p.desks.length; i++) p.desks[i] = flat[k++];
		});
	}

	function doGo() {
		const names = parseNames();
		const podSizeVal = parseInt(podInput.value, 10) || 1;
		if (names.length === 0) {
			pods = [];
			renderChart(parseInt(rowsInput.value, 10), parseInt(colsInput.value, 10), podSizeVal);
			return;
		}
		let rows = parseInt(rowsInput.value, 10) || 1;
		let cols = parseInt(colsInput.value, 10) || 1;
		const { rows: r2, cols: c2 } = autoExpandLayout(names.length, rows, cols, podSizeVal);
		rows = r2; cols = c2;
		rowsInput.value = rows; colsInput.value = cols;

		generatePods(names, rows, cols, podSizeVal);
		renderChart(rows, cols, podSizeVal);
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
