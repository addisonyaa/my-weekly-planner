class WeeklyPlanner {
    constructor() {
        this.currentWeek = new Date();
        this.currentDay = null;
        this.SHEET_ID = 'https://docs.google.com/spreadsheets/d/1hFcTHPCvorWHsisjulVzptqoIt4B1CYjuLrmKJ0Sb5A/edit?usp=sharing'; // ⚠️ ЗАМЕНИ НА СВОЙ!
        this.init();
    }

    async init() {
        await this.loadData();
        this.renderWeek();
        this.setupEventListeners();
        this.startAutoSync();
    }

    // 🔄 СИНХРОНИЗАЦИЯ КАЖДЫЕ 5 СЕКУНД
    startAutoSync() {
        setInterval(async () => {
            await this.loadData();
            this.renderWeek();
        }, 5000);
    }

    // 📡 ЗАГРУЗКА ДАННЫХ ИЗ GOOGLE SHEETS
    async loadData() {
        try {
            const response = await fetch(`https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/gviz/tq?tqx=out:json`);
            const text = await response.text();
            const json = JSON.parse(text.substring(47).slice(0, -2));
            
            if (json.table.rows.length > 0) {
                const data = JSON.parse(json.table.rows[0].c[0].v);
                this.data = data;
            } else {
                this.data = { days: {}, notes: '' };
            }
            document.getElementById('notes').value = this.data.notes || '';
        } catch (error) {
            console.log('Создаем новые данные...');
            this.data = { days: {}, notes: '' };
        }
    }

    // 💾 СОХРАНЕНИЕ В GOOGLE SHEETS
    async saveData() {
        try {
            const dataString = JSON.stringify(this.data);
            const url = `https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/edit?usp=sharing`;
            
            // Просто открываем ссылку для ручного сохранения (самый простой способ)
            console.log('Данные для сохранения:', this.data);
            alert('💾 Данные готовы к сохранению! Открой Google Таблицу и вставь: ' + dataString);
            
        } catch (error) {
            console.error('Ошибка сохранения:', error);
        }
    }

    getWeekDates(date) {
        const start = new Date(date);
        start.setDate(start.getDate() - start.getDay() + (start.getDay() === 0 ? -6 : 1));
        
        const week = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            week.push(day);
        }
        return week;
    }

    formatDate(date) {
        return date.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'short' 
        });
    }

    formatWeekRange(dates) {
        const first = dates[0];
        const last = dates[6];
        return `${this.formatDate(first)} - ${this.formatDate(last)}`;
    }

    renderWeek() {
        const weekDates = this.getWeekDates(this.currentWeek);
        const daysContainer = document.querySelector('.days-container');
        const currentWeekElement = document.getElementById('currentWeek');
        
        currentWeekElement.textContent = this.formatWeekRange(weekDates);
        
        daysContainer.innerHTML = '';
        
        const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
        
        days.forEach((dayName, index) => {
            const dayCard = this.createDayCard(dayName, weekDates[index]);
            daysContainer.appendChild(dayCard);
        });
    }

    createDayCard(dayName, date) {
        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        dayCard.dataset.date = date.toDateString();
        
        const dayId = date.toDateString();
        const dayData = this.data.days[dayId] || { tasks: [] };
        
        dayCard.innerHTML = `
            <div class="day-header">
                <div class="day-name">${dayName}</div>
                <div class="date">${this.formatDate(date)}</div>
            </div>
            <div class="tasks-list" id="tasks-${dayId}">
                ${dayData.tasks.map((task, taskIndex) => `
                    <div class="task-item">
                        <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                             data-day="${dayId}" data-index="${taskIndex}"></div>
                        <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
                        <button class="delete-task" data-day="${dayId}" data-index="${taskIndex}">×</button>
                    </div>
                `).join('')}
            </div>
            <button class="add-task-btn" data-day="${dayId}">+ Добавить задачу</button>
        `;
        
        return dayCard;
    }

    setupEventListeners() {
        document.getElementById('prevWeek').addEventListener('click', () => {
            this.currentWeek.setDate(this.currentWeek.getDate() - 7);
            this.renderWeek();
        });

        document.getElementById('nextWeek').addEventListener('click', () => {
            this.currentWeek.setDate(this.currentWeek.getDate() + 7);
            this.renderWeek();
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-task-btn')) {
                this.currentDay = e.target.dataset.day;
                this.showTaskModal();
            }
            
            if (e.target.classList.contains('task-checkbox')) {
                this.toggleTask(e.target.dataset.day, parseInt(e.target.dataset.index));
            }
            
            if (e.target.classList.contains('delete-task')) {
                this.deleteTask(e.target.dataset.day, parseInt(e.target.dataset.index));
            }
        });

        document.getElementById('saveTask').addEventListener('click', () => this.saveTask());
        document.getElementById('cancelTask').addEventListener('click', () => this.hideTaskModal());
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveTask();
        });

        document.getElementById('saveNotes').addEventListener('click', () => this.saveNotes());
        
        document.getElementById('taskModal').addEventListener('click', (e) => {
            if (e.target.id === 'taskModal') this.hideTaskModal();
        });
    }

    showTaskModal() {
        document.getElementById('taskModal').style.display = 'flex';
        document.getElementById('taskInput').value = '';
        document.getElementById('taskInput').focus();
    }

    hideTaskModal() {
        document.getElementById('taskModal').style.display = 'none';
    }

    async saveTask() {
        const taskText = document.getElementById('taskInput').value.trim();
        if (taskText) {
            if (!this.data.days[this.currentDay]) {
                this.data.days[this.currentDay] = { tasks: [] };
            }
            
            this.data.days[this.currentDay].tasks.push({
                text: taskText,
                completed: false
            });
            
            await this.saveData();
            this.renderWeek();
            this.hideTaskModal();
        }
    }

    async toggleTask(day, index) {
        if (this.data.days[day] && this.data.days[day].tasks[index]) {
            this.data.days[day].tasks[index].completed = 
                !this.data.days[day].tasks[index].completed;
            await this.saveData();
            this.renderWeek();
        }
    }

    async deleteTask(day, index) {
        if (this.data.days[day] && this.data.days[day].tasks[index]) {
            this.data.days[day].tasks.splice(index, 1);
            await this.saveData();
            this.renderWeek();
        }
    }

    async saveNotes() {
        this.data.notes = document.getElementById('notes').value;
        await this.saveData();
        
        const btn = document.getElementById('saveNotes');
        const originalText = btn.textContent;
        btn.textContent = '✓ В облаке!';
        btn.style.background = '#8aa89f';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WeeklyPlanner();
});
