// 🔥 ВСТАВЬ СЮДА СВОЙ НАСТОЯЩИЙ КОД ИЗ FIREBASE!
const firebaseConfig = {
  apiKey: "AIzaSyCRCwQiqAGupjwv8yeBwXXGu4wsDmsVgUA",
  authDomain: "my-weekly-planner-e81a2.firebaseapp.com", 
  projectId: "my-weekly-planner-e81a2",
  storageBucket: "my-weekly-planner-e81a2.firebasestorage.app",
  messagingSenderId: "165501344909",
  appId: "1:165501344909:web:68bcdca4b453b191f456c4"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

class WeeklyPlanner {
    constructor() {
        this.currentWeek = new Date();
        this.currentDay = null;
        this.userId = 'main_user'; // Фиксированный ID для всех
        this.data = { days: {}, notes: '' }; // Инициализация по умолчанию
        this.init();
    }

    async init() {
        await this.loadData();
        this.renderWeek();
        this.setupEventListeners();
        this.startRealTimeSync();
    }

    // 🔄 СИНХРОНИЗАЦИЯ В РЕАЛЬНОМ ВРЕМЕНИ
    startRealTimeSync() {
        db.collection('planners').doc(this.userId)
            .onSnapshot((doc) => {
                console.log('Данные обновлены из облака!');
                if (doc.exists) {
                    this.data = doc.data();
                    this.renderWeek();
                    document.getElementById('notes').value = this.data.notes || '';
                } else {
                    // Если документа нет - создаем пустой
                    this.data = { days: {}, notes: '' };
                    this.saveData();
                }
            }, (error) => {
                console.error('Ошибка синхронизации:', error);
            });
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
        
        // 🔧 ИСПРАВЛЕНИЕ: Проверяем что days существует
        const daysData = this.data.days || {};
        const dayData = daysData[dayId] || { tasks: [] };
        
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
            // 🔧 ИСПРАВЛЕНИЕ: Гарантируем что days существует
            if (!this.data.days) this.data.days = {};
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
        if (this.data.days && this.data.days[day] && this.data.days[day].tasks[index]) {
            this.data.days[day].tasks[index].completed = 
                !this.data.days[day].tasks[index].completed;
            await this.saveData();
            this.renderWeek();
        }
    }

    async deleteTask(day, index) {
        if (this.data.days && this.data.days[day] && this.data.days[day].tasks[index]) {
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

    async loadData() {
        try {
            const doc = await db.collection('planners').doc(this.userId).get();
            if (doc.exists) {
                this.data = doc.data();
                console.log('Данные загружены:', this.data);
            } else {
                // Создаем новый документ если не существует
                this.data = { days: {}, notes: '' };
                await this.saveData();
            }
            document.getElementById('notes').value = this.data.notes || '';
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            this.data = { days: {}, notes: '' };
        }
    }

    async saveData() {
        try {
            await db.collection('planners').doc(this.userId).set(this.data);
            console.log('Данные сохранены в облако!');
        } catch (error) {
            console.error('Ошибка сохранения:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WeeklyPlanner();
});
