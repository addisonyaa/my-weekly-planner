class WeeklyPlanner {
    constructor() {
        this.currentWeek = new Date();
        this.currentDay = null;
        this.init();
    }

    init() {
        this.loadData();
        this.renderWeek();
        this.setupEventListeners();
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
        // Навигация по неделям
        document.getElementById('prevWeek').addEventListener('click', () => {
            this.currentWeek.setDate(this.currentWeek.getDate() - 7);
            this.renderWeek();
        });

        document.getElementById('nextWeek').addEventListener('click', () => {
            this.currentWeek.setDate(this.currentWeek.getDate() + 7);
            this.renderWeek();
        });

        // Модальное окно для задач
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

        // Управление модальным окном
        document.getElementById('saveTask').addEventListener('click', () => this.saveTask());
        document.getElementById('cancelTask').addEventListener('click', () => this.hideTaskModal());
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveTask();
        });

        // Заметки
        document.getElementById('saveNotes').addEventListener('click', () => this.saveNotes());
        
        // Закрытие модального окна по клику вне его
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

    saveTask() {
        const taskText = document.getElementById('taskInput').value.trim();
        if (taskText) {
            if (!this.data.days[this.currentDay]) {
                this.data.days[this.currentDay] = { tasks: [] };
            }
            
            this.data.days[this.currentDay].tasks.push({
                text: taskText,
                completed: false
            });
            
            this.saveData();
            this.renderWeek();
            this.hideTaskModal();
        }
    }

    toggleTask(day, index) {
        if (this.data.days[day] && this.data.days[day].tasks[index]) {
            this.data.days[day].tasks[index].completed = 
                !this.data.days[day].tasks[index].completed;
            this.saveData();
            this.renderWeek();
        }
    }

    deleteTask(day, index) {
        if (this.data.days[day] && this.data.days[day].tasks[index]) {
            this.data.days[day].tasks.splice(index, 1);
            this.saveData();
            this.renderWeek();
        }
    }

    saveNotes() {
        this.data.notes = document.getElementById('notes').value;
        this.saveData();
        
        // Показать уведомление о сохранении
        const btn = document.getElementById('saveNotes');
        const originalText = btn.textContent;
        btn.textContent = '✓ Сохранено!';
        btn.style.background = '#8aa89f';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }

    loadData() {
        const saved = localStorage.getItem('weeklyPlanner');
        this.data = saved ? JSON.parse(saved) : { days: {}, notes: '' };
        document.getElementById('notes').value = this.data.notes || '';
    }

    saveData() {
        localStorage.setItem('weeklyPlanner', JSON.stringify(this.data));
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new WeeklyPlanner();
});