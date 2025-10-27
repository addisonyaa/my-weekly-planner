// 🔥 Supabase конфигурация
const SUPABASE_URL = 'https://sjmccwfxlpnkigaostkg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqbWNjd2Z4bHBua2lnYW9zdGtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODI1ODcsImV4cCI6MjA3NzE1ODU4N30.Y9eFZVU2AcLpT2cnb07eAlkVzFG5UTCUp48wXmv1x9E';

class WeeklyPlanner {
    constructor() {
        this.currentWeek = new Date();
        this.currentDay = null;
        this.userId = 'main_user';
        this.data = { days: {}, notes: '' };
        this.init();
    }

    async init() {
        await this.loadData();
        this.renderWeek();
        this.setupEventListeners();
        this.startRealTimeSync();
    }

    // 🔄 СИНХРОНИЗАЦИЯ В РЕАЛЬНОМ ВРЕМЕНИ
    async startRealTimeSync() {
        // Создаем подключение к Supabase для реального времени
        const eventSource = new EventSource(`${SUPABASE_URL}/rest/v1/planners?user_id=eq.${this.userId}&apikey=${SUPABASE_KEY}`);
        
        eventSource.onmessage = async (event) => {
            console.log('🔄 Данные обновлены из облака!');
            await this.loadData();
            this.renderWeek();
        };

        // Также периодическая проверка каждые 5 секунд
        setInterval(async () => {
            await this.loadData();
            this.renderWeek();
        }, 5000);
    }

    // 📡 ЗАГРУЗКА ДАННЫХ ИЗ SUPABASE
    async loadData() {
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/planners?user_id=eq.${this.userId}&select=*`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.length > 0 && data[0].data) {
                    this.data = data[0].data;
                }
            }
            document.getElementById('notes').value = this.data.notes || '';
        } catch (error) {
            console.log('Используем локальные данные');
        }
    }

    // 💾 СОХРАНЕНИЕ ДАННЫХ В SUPABASE
    async saveData() {
        try {
            // Сначала проверяем существует ли запись
            const checkResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/planners?user_id=eq.${this.userId}`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                    }
                }
            );

            const existingData = await checkResponse.json();
            
            if (existingData.length > 0) {
                // Обновляем существующую запись
                await fetch(
                    `${SUPABASE_URL}/rest/v1/planners?user_id=eq.${this.userId}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({
                            data: this.data,
                            updated_at: new Date().toISOString()
                        })
                    }
                );
            } else {
                // Создаем новую запись
                await fetch(
                    `${SUPABASE_URL}/rest/v1/planners`,
                    {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({
                            user_id: this.userId,
                            data: this.data,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                    }
                );
            }
            
            this.showSyncStatus('✅ Сохранено в облако!');
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            this.showSyncStatus('❌ Ошибка синхронизации');
        }
    }

    showSyncStatus(message) {
        let status = document.querySelector('.sync-status');
        if (!status) {
            status = document.createElement('div');
            status.className = 'sync-status';
            status.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: #a8c0b8;
                color: white;
                padding: 8px 15px;
                border-radius: 20px;
                font-size: 12px;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            `;
            document.body.appendChild(status);
        }
        
        status.textContent = message;
        status.style.display = 'block';
        
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
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
        const dayData = this.data.days && this.data.days[dayId] ? this.data.days[dayId] : { tasks: [] };
        
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
}

document.addEventListener('DOMContentLoaded', () => {
    new WeeklyPlanner();
});
