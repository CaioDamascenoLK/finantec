// Estado global da aplicação
const state = {
    currentMonth: new Date().toISOString().slice(0, 7),
    data: {},
    editingItem: null // { type: 'incomes'|'expenses'|'investments', id: itemId }
}

// Variáveis para as instâncias dos gráficos
let barChartInstance = null
let pieChartInstance = null

// Configuração e Inicialização dos Gráficos
const initCharts = () => {
    // 1. Gráfico de Barras
    const ctxBar = document.getElementById('barChart').getContext('2d')
    barChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['Entradas', 'Despesas', 'Investimentos'],
            datasets: [{
                label: 'Total (R$)',
                data: [0, 0, 0],
                backgroundColor: ['#04d361', '#e83f5b', '#8257e6'],
                borderRadius: 4,
                barThickness: 40
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'x',
            plugins: { 
                legend: { display: false },
                filler: { propagate: true }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { color: '#29292e' }, 
                    ticks: { color: '#a8a8b3' },
                    max: undefined
                },
                x: { 
                    grid: { display: false }, 
                    ticks: { color: '#a8a8b3' } 
                }
            }
        }
    })

    // 2. Gráfico de Pizza
    const ctxPie = document.getElementById('pieChart').getContext('2d')
    pieChartInstance = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Despesas', 'Investimentos', 'Saldo Livre'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#e83f5b', '#8257e6', '#04d361'],
                borderColor: '#202024',
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        color: '#a8a8b3', 
                        font: { size: 11 },
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    },
                    fullSize: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 10,
                    displayColors: true
                }
            }
        }
    })
}

// Apply colors from settings into CSS variables and charts
const applyColorsToUI = (colors) => {
    const root = document.documentElement
    root.style.setProperty('--color-income', colors.income)
    root.style.setProperty('--color-expense', colors.expense)
    root.style.setProperty('--color-invest', colors.invest)

    // keep some legacy vars for other styles
    root.style.setProperty('--green', colors.income)
    root.style.setProperty('--red', colors.expense)
    root.style.setProperty('--primary', colors.invest)
}

const updateChartsColors = (colors) => {
    if (barChartInstance) {
        barChartInstance.data.datasets[0].backgroundColor = [colors.income, colors.expense, colors.invest]
        barChartInstance.update()
    }
    if (pieChartInstance) {
        pieChartInstance.data.datasets[0].backgroundColor = [colors.expense, colors.invest, colors.income]
        pieChartInstance.update()
    }
}

// Migrate old JSON format to new format for backwards compatibility
const migrateData = (data) => {
    const defaultColors = { income: '#04d361', expense: '#e83f5b', invest: '#8257e6' }
    
    // Check if this is old format (no _settings)
    const isOldFormat = !data._settings
    
    // Add _settings if missing
    if (!data._settings) {
        data._settings = {
            colors: defaultColors,
            theme: 'dark'
        }
    } else {
        // Ensure colors object has all required properties
        if (!data._settings.colors) {
            data._settings.colors = defaultColors
        } else {
            data._settings.colors.income = data._settings.colors.income || defaultColors.income
            data._settings.colors.expense = data._settings.colors.expense || defaultColors.expense
            data._settings.colors.invest = data._settings.colors.invest || defaultColors.invest
        }
        // Ensure theme exists
        if (!data._settings.theme) {
            data._settings.theme = 'dark'
        }
    }
    
    // Add _metadata if missing
    if (!data._metadata) {
        data._metadata = {
            app: "FinTec Pro",
            version: "1.0",
            logo: "logofinantec.png",
            importedAt: new Date().toISOString(),
            migratedFromOldFormat: isOldFormat
        }
    }
    
    // Ensure all month entries have proper structure
    Object.keys(data).forEach(key => {
        if (key.match(/^\d{4}-\d{2}$/)) { // Month format: 2024-01
            if (!data[key].incomes) data[key].incomes = []
            if (!data[key].expenses) data[key].expenses = []
            if (!data[key].investments) data[key].investments = []
            
            // Add colors to transactions if missing (old format didn't have per-item colors)
            if (isOldFormat) {
                data[key].incomes.forEach(item => {
                    if (!item.color) item.color = defaultColors.income
                })
                data[key].expenses.forEach(item => {
                    if (!item.color) item.color = defaultColors.expense
                })
                data[key].investments.forEach(item => {
                    if (!item.color) item.color = defaultColors.invest
                })
            }
        }
    })
    
    return data
}

// Funções do App
const app = {
    init: () => {
        // Load saved data (transactions + settings)
        const saved = localStorage.getItem('finData')
        if (saved) {
            state.data = JSON.parse(saved)
        }

        // Migrate old format to new format (handles both old localStorage and uploaded files)
        state.data = migrateData(state.data)

        const monthSelector = document.getElementById('monthSelector')
        if (monthSelector) {
            monthSelector.value = state.currentMonth
            monthSelector.addEventListener('change', (e) => {
                state.currentMonth = e.target.value
                app.render()
            })
        }

        // Initialize charts and apply stored colors
        initCharts()
        applyColorsToUI(state.data._settings.colors)
        updateChartsColors(state.data._settings.colors)

        // Wire optional header color pickers (may be absent)
        const incColor = document.getElementById('incomeColor')
        const expColor = document.getElementById('expenseColor')
        const invColor = document.getElementById('investColor')
        if (incColor && expColor && invColor) {
            incColor.value = state.data._settings.colors.income
            expColor.value = state.data._settings.colors.expense
            invColor.value = state.data._settings.colors.invest

            incColor.addEventListener('input', (e) => {
                state.data._settings.colors.income = e.target.value
                applyColorsToUI(state.data._settings.colors)
                updateChartsColors(state.data._settings.colors)
                app.saveLocal(true)
            })
            expColor.addEventListener('input', (e) => {
                state.data._settings.colors.expense = e.target.value
                applyColorsToUI(state.data._settings.colors)
                updateChartsColors(state.data._settings.colors)
                app.saveLocal(true)
            })
            invColor.addEventListener('input', (e) => {
                state.data._settings.colors.invest = e.target.value
                applyColorsToUI(state.data._settings.colors)
                updateChartsColors(state.data._settings.colors)
                app.saveLocal(true)
            })
        }

        // Theme toggle (guarded)
        const themeToggle = document.getElementById('themeToggle')
        const themeToggleMobile = document.getElementById('themeToggleMobile')
        const body = document.body
        if (themeToggle) {
            themeToggle.checked = state.data._settings.theme === 'light'
            if (state.data._settings.theme === 'light') body.classList.add('light-theme')

            themeToggle.addEventListener('change', (e) => {
                state.data._settings.theme = e.target.checked ? 'light' : 'dark'
                if (e.target.checked) body.classList.add('light-theme')
                else body.classList.remove('light-theme')
                if (themeToggleMobile) themeToggleMobile.checked = e.target.checked
                app.saveLocal(true)
            })
        } else {
            // Apply stored theme even when toggle control missing
            if (state.data._settings.theme === 'light') body.classList.add('light-theme')
            else body.classList.remove('light-theme')
        }

        // Mobile theme toggle
        if (themeToggleMobile) {
            themeToggleMobile.checked = state.data._settings.theme === 'light'
            themeToggleMobile.addEventListener('change', (e) => {
                state.data._settings.theme = e.target.checked ? 'light' : 'dark'
                if (e.target.checked) body.classList.add('light-theme')
                else body.classList.remove('light-theme')
                if (themeToggle) themeToggle.checked = e.target.checked
                app.saveLocal(true)
            })
        }

        app.render()
    },

    ensureMonthExists: () => {
        if (!state.data[state.currentMonth]) {
            state.data[state.currentMonth] = {
                incomes: [],
                expenses: [],
                investments: []
            }
        }
    },

    saveLocal: (silent = false) => {
        localStorage.setItem('finData', JSON.stringify(state.data))
        if (!silent) alert('Dados salvos localmente!')
    },

    downloadData: () => {
        // Add logo metadata to JSON
        const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        const dataWithLogo = {
            ...state.data,
            _metadata: {
                app: "FinTec Pro",
                version: "1.0",
                logo: "logofinantec.png",
                exportedAt: new Date().toISOString()
            }
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataWithLogo, null, 2))
        const downloadAnchorNode = document.createElement('a')
        downloadAnchorNode.setAttribute("href", dataStr)
        downloadAnchorNode.setAttribute("download", `FinTec-Pro-Backup-${date}.json`)
        document.body.appendChild(downloadAnchorNode)
        downloadAnchorNode.click()
        downloadAnchorNode.remove()
    },

    uploadData: (input) => {
        const file = input.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                let uploadedData = JSON.parse(e.target.result)
                
                // Migrate old format to new format
                uploadedData = migrateData(uploadedData)
                
                state.data = uploadedData
                app.saveLocal()
                app.render()
                
                // Notify user if data was migrated
                if (uploadedData._metadata?.migratedFromOldFormat) {
                    alert('✓ Backup importado com sucesso!\n\nDados foram atualizados para o novo formato automaticamente.')
                } else {
                    alert('✓ Backup restaurado com sucesso!')
                }
            } catch (err) {
                alert('Erro ao processar arquivo. Verifique se é um arquivo JSON válido.')
                console.error('Upload error:', err)
            }
        }
        reader.readAsText(file)
    },

    addTransaction: (type, isMobile = false) => {
        app.ensureMonthExists()
        const monthData = state.data[state.currentMonth]
        let newItem = null

        // Define IDs based on mobile or desktop
        const suffix = isMobile ? 'Mobile' : ''
        
        if (type === 'incomes') {
            const name = document.getElementById(`incName${suffix}`).value
            const val = parseFloat(document.getElementById(`incValue${suffix}`).value)
            const color = document.getElementById(`incItemColor${suffix}`) ? document.getElementById(`incItemColor${suffix}`).value : (state.data._settings.colors.income)
            if (!name || isNaN(val)) return alert('Dados inválidos')

            newItem = { id: Date.now(), name, value: val, color }
            monthData.incomes.push(newItem)

            document.getElementById(`incName${suffix}`).value = ''
            document.getElementById(`incValue${suffix}`).value = ''
            if (document.getElementById(`incItemColor${suffix}`)) document.getElementById(`incItemColor${suffix}`).value = state.data._settings.colors.income
        }
        else if (type === 'expenses') {
            const name = document.getElementById(`expName${suffix}`).value
            const planned = parseFloat(document.getElementById(`expPlanned${suffix}`).value) || 0
            const val = parseFloat(document.getElementById(`expValue${suffix}`).value)
            const date = document.getElementById(`expDate${suffix}`).value
            const color = document.getElementById(`expItemColor${suffix}`) ? document.getElementById(`expItemColor${suffix}`).value : (state.data._settings.colors.expense)

            if (!name || isNaN(val)) return alert('Dados inválidos. Preencha Nome e Valor Real.')

            newItem = { id: Date.now(), name, planned, value: val, date, color }
            monthData.expenses.push(newItem)

            document.getElementById(`expName${suffix}`).value = ''
            document.getElementById(`expPlanned${suffix}`).value = ''
            document.getElementById(`expValue${suffix}`).value = ''
            document.getElementById(`expDate${suffix}`).value = '' // Limpa a data também
            if (document.getElementById(`expItemColor${suffix}`)) document.getElementById(`expItemColor${suffix}`).value = state.data._settings.colors.expense
        }
        else if (type === 'investments') {
            const name = document.getElementById(`invName${suffix}`).value
            const typeInv = document.getElementById(`invType${suffix}`).value
            const val = parseFloat(document.getElementById(`invValue${suffix}`).value)
            const date = document.getElementById(`invDate${suffix}`).value
            const color = document.getElementById(`invItemColor${suffix}`) ? document.getElementById(`invItemColor${suffix}`).value : (state.data._settings.colors.invest)

            if (!name || isNaN(val)) return alert('Dados inválidos')

            newItem = { id: Date.now(), name, type: typeInv, value: val, date, color }
            monthData.investments.push(newItem)

            document.getElementById(`invName${suffix}`).value = ''
            document.getElementById(`invValue${suffix}`).value = ''
            if (document.getElementById(`invItemColor${suffix}`)) document.getElementById(`invItemColor${suffix}`).value = state.data._settings.colors.invest
        }

        app.render()
    },

    removeTransaction: (type, id) => {
        const list = state.data[state.currentMonth][type]
        state.data[state.currentMonth][type] = list.filter(item => item.id !== id)
        app.render()
    },

    editTransaction: (type, id) => {
        state.editingItem = { type, id }
        app.render()
    },

    saveEdit: (type, id) => {
        const list = state.data[state.currentMonth][type]
        const item = list.find(i => i.id === id)
        if (!item) return

        if (type === 'incomes') {
            const nameField = document.getElementById(`edit-name-${id}`)
            const valueField = document.getElementById(`edit-value-${id}`)
            if (nameField && valueField) {
                item.name = nameField.value || item.name
                item.value = parseFloat(valueField.value) || item.value
            }
        } else if (type === 'expenses') {
            const nameField = document.getElementById(`edit-name-${id}`)
            const plannedField = document.getElementById(`edit-planned-${id}`)
            const valueField = document.getElementById(`edit-value-${id}`)
            const dateField = document.getElementById(`edit-date-${id}`)
            if (nameField && plannedField && valueField && dateField) {
                item.name = nameField.value || item.name
                item.planned = parseFloat(plannedField.value) || item.planned
                item.value = parseFloat(valueField.value) || item.value
                item.date = dateField.value || item.date
            }
        } else if (type === 'investments') {
            const nameField = document.getElementById(`edit-name-${id}`)
            const valueField = document.getElementById(`edit-value-${id}`)
            const dateField = document.getElementById(`edit-date-${id}`)
            if (nameField && valueField && dateField) {
                item.name = nameField.value || item.name
                item.value = parseFloat(valueField.value) || item.value
                item.date = dateField.value || item.date
            }
        }
        
        state.editingItem = null
        app.render()
    },

    cancelEdit: () => {
        state.editingItem = null
        app.render()
    },

    formatCurrency: (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    },

    formatDate: (dateString) => {
        if (!dateString) return 'S/ Data'
        // Transforma YYYY-MM-DD em DD/MM/YYYY
        const [year, month, day] = dateString.split('-')
        return `${day}/${month}/${year}`
    },

    render: () => {
        app.ensureMonthExists()
        const currentData = state.data[state.currentMonth]
        
        // Cálculos
        const totalInc = currentData.incomes.reduce((acc, item) => acc + item.value, 0)
        const totalExp = currentData.expenses.reduce((acc, item) => acc + item.value, 0)
        const totalInv = currentData.investments.reduce((acc, item) => acc + item.value, 0)
        const balance = totalInc - (totalExp + totalInv)

        // Update state summary
        state.summary = {
            totalIncome: totalInc,
            totalExpense: totalExp,
            totalInvest: totalInv,
            balance: balance
        }

        // Atualizar DOM (Totais) - Desktop
        document.getElementById('totalIncome').innerText = app.formatCurrency(totalInc)
        document.getElementById('totalExpense').innerText = app.formatCurrency(totalExp)
        document.getElementById('totalInvest').innerText = app.formatCurrency(totalInv)
        const balElem = document.getElementById('finalBalance')
        balElem.innerText = app.formatCurrency(balance)
        balElem.style.color = balance >= 0 ? '#04d361' : '#e83f5b'

        // Atualizar DOM (Totais) - Mobile
        const incElemMobile = document.getElementById('totalIncomeMobile')
        const expElemMobile = document.getElementById('totalExpenseMobile')
        const invElemMobile = document.getElementById('totalInvestMobile')
        const balElemMobile = document.getElementById('finalBalanceMobile')
        if (incElemMobile) incElemMobile.innerText = app.formatCurrency(totalInc)
        if (expElemMobile) expElemMobile.innerText = app.formatCurrency(totalExp)
        if (invElemMobile) invElemMobile.innerText = app.formatCurrency(totalInv)
        if (balElemMobile) {
            balElemMobile.innerText = app.formatCurrency(balance)
            balElemMobile.style.color = balance >= 0 ? '#04d361' : '#e83f5b'
        }

        // Renderizar Listas
        const renderList = (elId, list, type) => {
            const ul = document.getElementById(elId)
            ul.innerHTML = ''
            const typeDefault = type === 'incomes' ? state.data._settings.colors.income : type === 'expenses' ? state.data._settings.colors.expense : state.data._settings.colors.invest
            list.forEach(item => {
                const li = document.createElement('li')
                const isEditing = state.editingItem && state.editingItem.type === type && state.editingItem.id === item.id

                if (isEditing) {
                    // Show edit form
                    let editHtml = `<div class="edit-form">`
                    
                    if (type === 'incomes') {
                        editHtml += `
                            <div class="edit-field">
                                <label>Nome</label>
                                <input type="text" id="edit-name-${item.id}" value="${item.name}" />
                            </div>
                            <div class="edit-field">
                                <label>Valor</label>
                                <input type="number" id="edit-value-${item.id}" value="${item.value}" step="0.01" />
                            </div>
                        `
                    } else if (type === 'expenses') {
                        editHtml += `
                            <div class="edit-field">
                                <label>Nome</label>
                                <input type="text" id="edit-name-${item.id}" value="${item.name}" />
                            </div>
                            <div class="edit-field">
                                <label>Valor Planejado</label>
                                <input type="number" id="edit-planned-${item.id}" value="${item.planned || 0}" step="0.01" />
                            </div>
                            <div class="edit-field">
                                <label>Valor Real</label>
                                <input type="number" id="edit-value-${item.id}" value="${item.value}" step="0.01" />
                            </div>
                            <div class="edit-field">
                                <label>Data</label>
                                <input type="date" id="edit-date-${item.id}" value="${item.date || ''}" />
                            </div>
                        `
                    } else if (type === 'investments') {
                        editHtml += `
                            <div class="edit-field">
                                <label>Nome</label>
                                <input type="text" id="edit-name-${item.id}" value="${item.name}" />
                            </div>
                            <div class="edit-field">
                                <label>Valor</label>
                                <input type="number" id="edit-value-${item.id}" value="${item.value}" step="0.01" />
                            </div>
                            <div class="edit-field">
                                <label>Data</label>
                                <input type="date" id="edit-date-${item.id}" value="${item.date || ''}" />
                            </div>
                        `
                    }
                    
                    editHtml += `
                        <div class="edit-buttons">
                            <button onclick="app.saveEdit('${type}', ${item.id})" class="btn-save-edit">Salvar</button>
                            <button onclick="app.cancelEdit()" class="btn-cancel-edit">Cancelar</button>
                        </div>
                    </div>`
                    
                    li.innerHTML = editHtml
                    li.classList.add('edit-mode')
                } else {
                    // Show normal view
                    const itemColor = item.color || typeDefault
                    let html = `<div><strong><span style="display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:8px;vertical-align:middle;background:${itemColor};"></span>${item.name}</strong>`

                    if (type === 'expenses') {
                        const dateDisplay = app.formatDate(item.date)
                        html += `<br><small style="color: #a8a8b3">Vence: ${dateDisplay} | Plan: ${app.formatCurrency(item.planned)}</small>`
                    }

                    if (type === 'investments') {
                        const dateDisplay = app.formatDate(item.date)
                        html += `<br><small style="color: #a8a8b3">${item.type} em ${dateDisplay}</small>`
                    }

                    html += `</div>`
                    html += `<div><span>${app.formatCurrency(item.value)}</span> <span class="edit-btn" onclick="app.editTransaction('${type}', ${item.id})" title="Editar">✎</span> <span class="del-btn" onclick="app.removeTransaction('${type}', ${item.id})">X</span></div>`

                    li.innerHTML = html
                }

                ul.appendChild(li)
            })
        }

        renderList('list-incomes', currentData.incomes, 'incomes')
        renderList('list-expenses', currentData.expenses, 'expenses')
        renderList('list-investments', currentData.investments, 'investments')

        // Render mobile versions of lists
        if (document.getElementById('list-incomesMobile')) {
            renderList('list-incomesMobile', currentData.incomes, 'incomes')
        }
        if (document.getElementById('list-expensesMobile')) {
            renderList('list-expensesMobile', currentData.expenses, 'expenses')
        }
        if (document.getElementById('list-investmentsMobile')) {
            renderList('list-investmentsMobile', currentData.investments, 'investments')
        }

        // Atualização dos Gráficos
        if (barChartInstance) {
            barChartInstance.data.datasets[0].data = [totalInc, totalExp, totalInv]
            // ensure colors reflect current settings
            const colors = state.data._settings ? state.data._settings.colors : { income: '#04d361', expense: '#e83f5b', invest: '#8257e6' }
            barChartInstance.data.datasets[0].backgroundColor = [colors.income, colors.expense, colors.invest]
            barChartInstance.update()
        }

        if (pieChartInstance) {
            // Pie chart: Despesas + Investment Types + Saldo Livre
            const colors = state.data._settings ? state.data._settings.colors : { income: '#04d361', expense: '#e83f5b', invest: '#8257e6' }
            const safeBalance = balance > 0 ? balance : 0
            
            // Calculate totals for each investment type
            const investmentTypes = {
                'Reserva': 0,
                'Ações': 0,
                'FIIs': 0,
                'Renda Fixa': 0
            }
            
            currentData.investments.forEach(item => {
                const type = item.type || 'Reserva'
                if (investmentTypes.hasOwnProperty(type)) {
                    investmentTypes[type] += item.value
                }
            })
            
            // Build labels and data arrays
            const labels = ['Despesas']
            const data = [totalExp]
            const bgColors = [colors.expense]
            
            // Generate color variations for investment types
            const investColors = {
                'Reserva': '#8257e6',      // purple (base color)
                'Ações': '#6b4fc9',        // darker purple
                'FIIs': '#9c6be6',         // lighter purple
                'Renda Fixa': '#b39ddb'    // even lighter purple
            }
            
            // Add investment types that have values
            Object.entries(investmentTypes).forEach(([type, value]) => {
                if (value > 0) {
                    labels.push(type)
                    data.push(value)
                    bgColors.push(investColors[type] || colors.invest)
                }
            })
            
            // Add balance at the end
            labels.push('Saldo Livre')
            data.push(safeBalance)
            bgColors.push(colors.income)
            
            pieChartInstance.data.labels = labels
            pieChartInstance.data.datasets[0].data = data
            pieChartInstance.data.datasets[0].backgroundColor = bgColors
            pieChartInstance.update()
        }

        // Autosave without alert
        app.saveLocal(true)
    },

    // Switch between tabs
    switchTab: function(tabName) {
        // Hide all tabs
        const allTabs = document.querySelectorAll('.tab-content')
        allTabs.forEach(tab => tab.classList.remove('active'))

        // Remove active class from all nav buttons
        const allNavBtns = document.querySelectorAll('.nav-btn')
        allNavBtns.forEach(btn => btn.classList.remove('active'))

        // Show selected tab
        const tabMap = {
            'home': 'tabHome',
            'analytics': 'tabAnalytics',
            'adddata': 'tabAddData',
            'settings': 'tabSettings'
        }
        const tabId = tabMap[tabName]
        const selectedTab = document.getElementById(tabId)
        if (selectedTab) {
            selectedTab.classList.add('active')
        }

        // Set active button
        const navBtns = document.querySelectorAll('.nav-btn')
        const tabIndex = Object.keys(tabMap).indexOf(tabName)
        if (navBtns[tabIndex]) {
            navBtns[tabIndex].classList.add('active')
        }

        // Redraw charts if analytics tab is active
        if (tabName === 'analytics') {
            setTimeout(() => {
                if (barChartInstance) barChartInstance.resize()
                if (pieChartInstance) pieChartInstance.resize()
            }, 100)
        }
    },

    // Update all summary displays (desktop and mobile)
    updateAllSummaries: function() {
        const totalIncome = document.getElementById('totalIncome')
        const totalExpense = document.getElementById('totalExpense')
        const totalInvest = document.getElementById('totalInvest')
        const finalBalance = document.getElementById('finalBalance')

        const totalIncomeMobile = document.getElementById('totalIncomeMobile')
        const totalExpenseMobile = document.getElementById('totalExpenseMobile')
        const totalInvestMobile = document.getElementById('totalInvestMobile')
        const finalBalanceMobile = document.getElementById('finalBalanceMobile')

        if (totalIncome) totalIncome.textContent = `R$ ${state.summary.totalIncome.toFixed(2).replace(/\./g, ',')}`
        if (totalExpense) totalExpense.textContent = `R$ ${state.summary.totalExpense.toFixed(2).replace(/\./g, ',')}`
        if (totalInvest) totalInvest.textContent = `R$ ${state.summary.totalInvest.toFixed(2).replace(/\./g, ',')}`
        if (finalBalance) finalBalance.textContent = `R$ ${state.summary.balance.toFixed(2).replace(/\./g, ',')}`

        if (totalIncomeMobile) totalIncomeMobile.textContent = `R$ ${state.summary.totalIncome.toFixed(2).replace(/\./g, ',')}`
        if (totalExpenseMobile) totalExpenseMobile.textContent = `R$ ${state.summary.totalExpense.toFixed(2).replace(/\./g, ',')}`
        if (totalInvestMobile) totalInvestMobile.textContent = `R$ ${state.summary.totalInvest.toFixed(2).replace(/\./g, ',')}`
        if (finalBalanceMobile) finalBalanceMobile.textContent = `R$ ${state.summary.balance.toFixed(2).replace(/\./g, ',')}`
    }
}

window.onload = app.init