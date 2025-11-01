function formatDateWithDay(dateStr) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, options);
}

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("budget-form");
  const entriesContainer = document.getElementById("entries");
  const overallTotalDisplay = document.getElementById("overall-total");
  const budgetInput = document.getElementById("budget-input");
  const budgetSummary = document.getElementById("budget-summary");
  const budgetDifference = document.getElementById("budget-difference");
  const toggleBtn = document.getElementById("toggle-entries-btn");
  const sortToggleBtn = document.getElementById("sort-toggle-btn");

    // Auto-fill food and fare based on selected date
  const dateInput = document.getElementById("date");
  const foodInput = document.getElementById("food");
  const fareInput = document.getElementById("fare");

  dateInput.addEventListener("change", () => {
    const selectedDate = new Date(dateInput.value);
    if (isNaN(selectedDate)) return;

    const day = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday

    // Weekdays (Mon–Fri)
    if (day >= 1 && day <= 5) {
      foodInput.value = 130;
      fareInput.value = 84;
    } 
    // Weekends (Sat, Sun)
    else {
      foodInput.value = 130;
      fareInput.value = 0;
    }
  });


  let entries = [];
  let sortAscending = true;
  let entriesVisible = true;

  // Load saved "on hand" budget
  const savedBudget = localStorage.getItem("budgetOnHand");
  if (savedBudget) {
    budgetInput.value = savedBudget;
  }

  // Load saved entries
  if (localStorage.getItem("budgetEntries")) {
    entries = JSON.parse(localStorage.getItem("budgetEntries"));
    sortEntries();
    renderAllEntries();
    updateOverallTotal();
    updateBudgetSummary(); // ✅ Fix: call after entries are loaded
  }

  // Save budget input on change
  budgetInput.addEventListener("input", () => {
    localStorage.setItem("budgetOnHand", budgetInput.value);
    updateBudgetSummary();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const date = document.getElementById("date").value;
    const food = parseFloat(document.getElementById("food").value) || 0;
    const fare = parseFloat(document.getElementById("fare").value) || 0;
    const total = food + fare;

    const entryObj = {
      id: Date.now(),
      date,
      food,
      fare,
      total
    };

    entries.push(entryObj);
    sortEntries();
    saveToLocalStorage();
    renderAllEntries();
    updateOverallTotal();
    form.reset();
  });

  function renderAllEntries() {
    entriesContainer.innerHTML = "";
    entries.forEach(renderEntry);
  }

  function renderEntry(entryObj) {
    const entry = document.createElement("div");
    entry.className = "bg-white shadow p-4 rounded-xl border border-gray-200 relative";
    entry.setAttribute("data-id", entryObj.id);

    const content = document.createElement("div");
    content.className = "space-y-1 mb-3 text-gray-700";

    function updateDisplay() {
      content.innerHTML = `
        <p><strong class="text-gray-600">Date:</strong><br>${formatDateWithDay(entryObj.date)}</p>
        <p><strong class="text-gray-600">Food:</strong><br><span class="text-green-700">₱${entryObj.food}</span></p>
        <p><strong class="text-gray-600">Fare:</strong><br><span class="text-green-700">₱${entryObj.fare}</span></p>
        <p class="mt-2"><strong class="text-gray-600">Total:</strong><br><span class="text-blue-700 font-bold text-lg">₱${entryObj.total}</span></p>
      `;
    }

    updateDisplay();
    entry.appendChild(content);

    const buttons = document.createElement("div");
    buttons.className = "flex gap-4 mt-2";

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "text-red-600 hover:underline";
    deleteBtn.textContent = "🗑️ Delete";
    deleteBtn.addEventListener("click", () => {
      const confirmed = confirm("Are you sure you want to delete this entry?");
      if (!confirmed) return;

      entries = entries.filter(e => e.id !== entryObj.id);
      saveToLocalStorage();
      entry.remove();
      updateOverallTotal();
    });

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.className = "text-blue-600 hover:underline";
    editBtn.textContent = "✏️ Edit";

    editBtn.addEventListener("click", () => {
      content.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label class="block text-sm text-gray-600">Date:</label>
            <input type="date" class="w-full p-2 border rounded" value="${entryObj.date}" id="edit-date-${entryObj.id}">
          </div>
          <div>
            <label class="block text-sm text-gray-600">Food:</label>
            <input type="number" class="w-full p-2 border rounded" value="${entryObj.food}" id="edit-food-${entryObj.id}">
          </div>
          <div>
            <label class="block text-sm text-gray-600">Fare:</label>
            <input type="number" class="w-full p-2 border rounded" value="${entryObj.fare}" id="edit-fare-${entryObj.id}">
          </div>
        </div>
      `;

      const saveBtn = document.createElement("button");
      saveBtn.className = "text-green-600 hover:underline";
      saveBtn.textContent = "💾 Save";

      buttons.replaceChild(saveBtn, editBtn);

      saveBtn.addEventListener("click", () => {
        const confirmed = confirm("Save changes?");
        if (!confirmed) return;

        const newDate = document.getElementById(`edit-date-${entryObj.id}`).value;
        const newFood = parseFloat(document.getElementById(`edit-food-${entryObj.id}`).value) || 0;
        const newFare = parseFloat(document.getElementById(`edit-fare-${entryObj.id}`).value) || 0;
        const newTotal = newFood + newFare;

        entryObj.date = newDate;
        entryObj.food = newFood;
        entryObj.fare = newFare;
        entryObj.total = newTotal;

        const index = entries.findIndex(e => e.id === entryObj.id);
        if (index !== -1) entries[index] = entryObj;

        sortEntries();
        saveToLocalStorage();
        renderAllEntries();
        updateOverallTotal();
      });
    });

    buttons.appendChild(editBtn);
    buttons.appendChild(deleteBtn);
    entry.appendChild(buttons);
    entriesContainer.appendChild(entry);
  }

  function updateOverallTotal() {
    const total = entries.reduce((sum, entry) => sum + entry.total, 0);
    overallTotalDisplay.textContent = `₱${total}`;
    updateBudgetSummary();
  }

  function updateBudgetSummary() {
    const onHand = parseFloat(budgetInput.value);
    const totalSpent = entries.reduce((sum, entry) => sum + entry.total, 0);

    if (isNaN(onHand)) {
      budgetDifference.textContent = "";
      budgetSummary.classList.remove("border-red-500", "border-blue-500");
      return;
    }

    const diff = onHand - totalSpent;
    budgetDifference.textContent =
      diff >= 0
        ? `You have ₱${diff} left (Excess)`
        : `You are ₱${Math.abs(diff)} short`;

    budgetSummary.classList.remove("border-red-500", "border-blue-500");

    if (diff >= 0) {
      budgetSummary.classList.add("border-blue-500");
      budgetDifference.className = "text-blue-700 font-semibold";
    } else {
      budgetSummary.classList.add("border-red-500");
      budgetDifference.className = "text-red-700 font-semibold";
    }
  }

  function saveToLocalStorage() {
    localStorage.setItem("budgetEntries", JSON.stringify(entries));
  }

  function sortEntries() {
    entries.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortAscending ? dateA - dateB : dateB - dateA;
    });
  }

  toggleBtn.addEventListener("click", () => {
    entriesVisible = !entriesVisible;
    entriesContainer.style.display = entriesVisible ? "block" : "none";
    toggleBtn.textContent = entriesVisible ? "🔽 Hide Entries" : "▶️ Show Entries";
  });

  sortToggleBtn.addEventListener("click", () => {
    sortAscending = !sortAscending;
    sortToggleBtn.textContent = sortAscending ? "⬇️ Oldest First" : "⬆️ Newest First";
    sortEntries();
    renderAllEntries();
  });

});
