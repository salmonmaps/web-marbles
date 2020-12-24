import domReady from "../dom-ready";

domReady.then(() => {
	let debugAmount = document.getElementById("debugAmount"),
		debugName = document.getElementById("debugName"),
		debugAddMarble = document.getElementById("debugAdd"),
		debugStart = document.getElementById("debugStart"),
		debugEnd = document.getElementById("debugEnd");

	debugAddMarble.addEventListener("click", function() {
		window.fetch(`/debug?marble=true&amount=${debugAmount.valueAsNumber}&name=${debugName.value}`);
	}, false);

	debugStart.addEventListener("click", function() {
		window.fetch("/debug?start=true");
	}, false);

	debugEnd.addEventListener("click", function() {
		window.fetch("/debug?end=true");
	}, false);
});
