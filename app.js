
// Seating Chart Generator — pods model
document.addEventListener('DOMContentLoaded', () => {
	const rowsInput = document.getElementById('rows');
	const colsInput = document.getElementById('cols');
	const podInput = document.getElementById('podSize');
	const podOptions = Array.from(document.querySelectorAll('.pod-option'));
	const shuffleBtn = document.getElementById('shuffle');
	const clearBtn = document.getElementById('clear');
	const printBtn = document.getElementById('print');
	const namesInput = document.getElementById('names');
	const chart = document.getElementById('chart');
	const printArea = document.getElementById('printArea');
	const widerButton = document.getElementById('wider');
	const narrowerButton = document.getElementById('narrower');
	const tallerButton = document.getElementById('taller');
	const shorterButton = document.getElementById('shorter');
	const sortButton = document.getElementById('sort');

	// capture elements that start hidden so we can restore them on Clear
	const initiallyHidden = Array.from(document.querySelectorAll('.hidden'));

	function setPodSize(size) {
		const podSize = Number(size) || 1;
		const adjustedSize = podSize === 3 ? 4 : podSize;
		podInput.value = adjustedSize;
		podOptions.forEach(option => {
			const isActive = Number(option.dataset.podSize) === adjustedSize;
			option.classList.toggle('active', isActive);
			option.setAttribute('aria-pressed', isActive ? 'true' : 'false');
		});
	}

	podOptions.forEach(option => {
		option.addEventListener('click', () => {
			setPodSize(option.dataset.podSize);
			doGo('podSize');
		});
	});

	setPodSize(podInput.value);

	// pods: array of { desks: [name, ...] }
	let pods = [];

	function parseNames() {
		const raw = namesInput.value || '';
		if (!raw.trim()) return [];
		// split on commas, newlines, or semicolons
		// trim, strip common list markers (bullets, dashes, numbered lists), and ignore empty entries
		return raw.split(/[,;\n]/).map(s => {
			// remove leading bullets/dashes (-, *, •), numbered items (1. or 1)), or lettered items (a. or a))
			const cleaned = s.replace(/^\s*(?:[-*•\u2022]|\d+[\.\)]|[A-Za-z][\.\)])\s*/, '');
			return cleaned.trim();
		}).filter(s => s.length > 0);
	}

	function autoExpandLayout(required, rows, cols, podSize, changed) {
		rows = Math.min(Math.max(1, rows), 8);
		cols = Math.min(Math.max(1, cols), 8);
		podSize = Math.min(Math.max(1, podSize || 1), 4);

		const canGrow = () => (rows < 8 || cols < 8 || podSize < 4);

		while (rows * cols * podSize < required && canGrow()) {
			if (changed === 'rows') {
				if (cols < 8) cols++;
				else if (podSize < 4) { podSize = podSize === 2 ? 4 : podSize + 1; setPodSize(podSize); }
				else if (rows < 8) rows++;
				else break;
			} else if (changed === 'cols') {
				if (rows < 8) rows++;
				else if (podSize < 4) { podSize = podSize === 2 ? 4 : podSize + 1; setPodSize(podSize); }
				else if (cols < 8) cols++;
				else break;
			} else if (changed === 'podSize') {
				if (rows < 8) rows++;
				else if (cols < 8) cols++;
				else if (podSize < 4) { podSize = podSize === 2 ? 4 : podSize + 1; setPodSize(podSize); }
				else break;
			} else {
				// fallback: alternate rows/cols growth, then pod size
				if (cols < 8) cols++;
				else if (rows < 8) rows++;
				else if (podSize < 4) { podSize = podSize === 2 ? 4 : podSize + 1; setPodSize(podSize); }
				else break;
			}
		}

		if (changed !== 'rows') {
			while ((rows - 1) * cols * podSize >= required && rows > 1) {
				rows--;
			}
		}

		return { rows, cols, podSize };
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
			// if this pod contains 4 desks, render them in a 2x2 square
			if (pod.desks && pod.desks.length === 4) podEl.classList.add('pod-square');

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

	function doGo(changed) {
		// remove any 'hidden' class markers when user clicks Go
		document.querySelectorAll('.hidden').forEach(el => el.classList.remove('hidden'));
		const names = parseNames();
		let podSizeVal = parseInt(podInput.value, 10) || 1;
		if (names.length === 0) {
			pods = [];
			renderChart(parseInt(rowsInput.value, 10), parseInt(colsInput.value, 10), podSizeVal);
			return;
		}
		let rows = parseInt(rowsInput.value, 10) || 1;
		let cols = parseInt(colsInput.value, 10) || 1;
		if (changed === 'podSize') {
			rows = 1;
			cols = 1;
		}
		const { rows: r2, cols: c2, podSize: p2 } = autoExpandLayout(names.length, rows, cols, podSizeVal, changed);
		rows = r2; cols = c2; podSizeVal = p2;
		rowsInput.value = rows; colsInput.value = cols;
		podInput.value = podSizeVal;

		generatePods(names, rows, cols, podSizeVal);
		renderChart(rows, cols, podSizeVal);
	}

	function doClear() {
		// erase names, clear pods/chart, reset inputs, and restore initial hidden elements
		namesInput.value = '';
		pods = [];
		chart.innerHTML = '';
		rowsInput.value = 1;
		colsInput.value = 1;
		setPodSize(1);
		initiallyHidden.forEach(el => el.classList.add('hidden'));
		// put focus back in names field
		namesInput.focus();
	}

	function doPrint() {
		// open a new window with only the chart
		const w = window.open('', '_blank');
		if (!w) return alert('Popup blocked: allow popups to use print.');
		const style = `<style>

* {
    box-sizing: border-box
}

body {
    font-family: system-ui, Segoe UI, Roboto, Helvetica, Arial;
    margin: 0;
    padding: 20px;
    background: #ffffff;
    color: #063740;
}

#chartWrapper {
    padding: 8px;
    margin-bottom: 100px;
}

.chart {
    display: grid;
    gap: 30px;
    background: transparent;
}

@media (max-width:900px) {
    .chart {
        gap: 10px;
    }
}

.seat {
    display: flex;
    align-items: stretch;
    justify-content: center;
    border: 2px solid #ccc;
    background: var(--seat-bg);
    border-radius: 6px;
    overflow: hidden;
    padding: 2px;
    text-align: center;
    user-select: none
}

.seat .name {
    display: block;
    width: 100%;
    padding: 2px 4px;
    font-weight: 600
}

.pod {
    display: flex;
    gap: 2px;
    width: 100%;
    align-items: stretch;
    height: 100%;
}

/* when a pod has 4 desks, show them in a 2x2 grid */
.pod-square {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 1fr;
    gap: 1px;
    align-items: stretch;
}

.desk {
    display: flex;
    flex: 1 1 0;
    min-width: 0;
    height: 100%;
}

.desk-seat {
    flex: 1 1 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    border: 2px solid #ccc;
    border-radius: 6px;
    padding: 6px 8px;
    min-height: 0;
    width: 100%;
    height: 100%;
    box-sizing: border-box
}

#boardLabel {
    width: 100%;
    padding: 5px;
    margin-bottom: 12px;
    background: #ffffff;
    border: 2px solid #ccc;
    border-radius: 4px;
    font-weight: 600;
    font-size: 14px;
    color: #333;
    text-align: center;
}

.hidden {
    display: none;
}</style>`;
		w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print</title>${style}</head><body><div class="print-area">${printArea.innerHTML}</div><script>setTimeout(()=>{window.print();},200);</script></body></html>`);
		w.document.close();
	}

	// wire up buttons
	shuffleBtn.addEventListener('click', () => { shuffleSeats(); renderChart(parseInt(rowsInput.value, 10), parseInt(colsInput.value, 10), parseInt(podInput.value, 10)); });
	printBtn.addEventListener('click', doPrint);
	document.getElementById('printBottom').addEventListener('click', doPrint);
	clearBtn.addEventListener('click', doClear);

	namesInput.addEventListener('input', () => {
		if (namesInput.value.trim()) doGo('names');
	})

	widerButton.addEventListener('click', () => {
		colsInput.value = Math.min(8, (parseInt(colsInput.value, 10) || 1) + 1);
		if (namesInput.value.trim()) doGo('cols');
	});
	narrowerButton.addEventListener('click', () => {
		colsInput.value = Math.max(1, (parseInt(colsInput.value, 10) || 1) - 1);
		if (namesInput.value.trim()) doGo('cols');
	});
	tallerButton.addEventListener('click', () => {
		rowsInput.value = Math.min(8, (parseInt(rowsInput.value, 10) || 1) + 1);
		if (namesInput.value.trim()) doGo('rows');
	});
	shorterButton.addEventListener('click', () => {
		rowsInput.value = Math.max(1, (parseInt(rowsInput.value, 10) || 1) - 1);
		if (namesInput.value.trim()) doGo('rows');
	});

	// apply chart immediately when rows or cols change
	rowsInput.addEventListener('input', () => {
		if (namesInput.value.trim()) doGo('rows');
	});
	colsInput.addEventListener('input', () => {
		if (namesInput.value.trim()) doGo('cols');
	});

	sortButton.addEventListener('click', () => {
		const names = parseNames().sort((a, b) => a.localeCompare(b));
		namesInput.value = names.join('\n');
		doGo('names');
	});

	// initial render
	// prefill example names for convenience
	if (!namesInput.value.trim()) {
		doClear();
		// namesInput.value = 'Soren-Alexis Vale Mercer\nRemy Clarke\nBo Quinn Hale\nAvery-Jules Mercer Cross\nLior Skye\nCassian River Thorn Vale\nAri Sol Carter\nSkyler Élan Cross Vale\nZee Rowan Hale\nHollis Alexander Wren Vale\nPax Mercer\nFinley-Rowan Ashford Vale\nIo Skye Carter\nMarlowe Seraphine Vale Cross\nRen Hale\nTatum Blake Mercer\nLux Vale\nEmberlynn Quinn Hale Cross\nAsh Carter\nDakota-Rain Mercer Vale\nElio Skye\nBriar Alexandria Skye Vale\nKit Hale\nZephyr Orion Vale Cross\nSol Mercer\nAvery Noël Carter\nOnyx Vale\nShiloh Evander Cross Vale\nRue Mercer\nLyric Hale';
	}
	// generate initial chart based on prefilled names and default inputs
	// doGo();
});
