var express = require('express');
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');
const fs = require('fs');
const path = require('path');
var app = express();

async function getDBConnection(){
    const db = await sqlite.open({
        filename: 'product.db', 
        driver: sqlite3.Database 
    });
    return db;
}

function readCommentsFile() {
    try {
        const commentsPath = path.join(__dirname, 'comments.json');
        if (fs.existsSync(commentsPath)) {
            const data = fs.readFileSync(commentsPath, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error reading comments.json:', error);
        return [];
    }
}

function writeCommentsFile(comments) {
    try {
        const commentsPath = path.join(__dirname, 'comments.json');
        fs.writeFileSync(commentsPath, JSON.stringify(comments, null, 2));
        console.log('Comments saved to comments.json');
        return true;
    } catch (error) {
        console.error('Error writing comments.json:', error);
        return false;
    }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// root url
app.get('/', async function(req, res){
    try {
        // DB 연결
        let db = await getDBConnection();
        
        // movies 테이블의 모든 아이템 조회
        let rows = await db.all('SELECT * FROM movies;');
        
        // 데이터베이스 연결 종료
        await db.close();
        
        // movie_info에 영화 이름을 개별 담음
        var movie_info = '';
        for (var i = 0; i < rows.length; i++) {
            movie_info += 'movie_title: ' + rows[i]['movie_title'] + ', release_date: ' + rows[i]['release_date'] + '<br>';
        }
        
        // HTML 생성 - 영화 데이터를 JavaScript 변수로 직접 삽입
        var output = 
        '<!DOCTYPE html>' +
        '<html>' +
        '<head>' +
            '<meta charset="utf-8">' +
            '<title>Movie Information Site</title>' +
            '<link rel="stylesheet" href="main.css">' +
        '</head>' +
        '<body>' +
            '<div class="container">' +
                '<header class="slide-wrapper">' +
                    '<h1 class="site-title">영화 정보 사이트입니다.</h1>' +
                '</header>' +
                '<nav class="navbar">' +
                    '<a href="/">메인페이지</a>' +
                    '<a href="/login">로그인</a>' +
                    '<a href="/signup">회원가입</a>' +
                '</nav>' +
                '<main class="main-content">' +
                    '<section class="controls">' +
                        '<input type="text" id="searchInput" placeholder="Search by title..." />' +
                        '<select id="sortSelect">' +
                            '<option value="">Sort</option>' +
                            '<option value="title-asc">Title ↑</option>' +
                            '<option value="title-desc">Title ↓</option>' +
                            '<option value="rating-asc">Rating ↑</option>' +
                            '<option value="rating-desc">Rating ↓</option>' +
                        '</select>' +
                    '</section>' +
                    '<section class="movies-section">' +
                        '<h2>Movies</h2>' +
                        '<div class="movies-group"></div>' +
                    '</section>' +
                    '<section class="about-section">' +
                        '<h2>About</h2>' +
                        '<p>인터넷프로그래밍 영화 소개 사이트입니다.</p>' +
                    '</section>' +
                '</main>' +
            '</div>' +
            // 영화 데이터를 JavaScript 변수로 주입 (fetch 없이!)
            '<script>' +
                'var allMovies = ' + JSON.stringify(rows) + ';' +
                'console.log("Loaded", allMovies.length, "movies from server");' +
                
                // 영화 카드 생성 함수
                'function createMovieCard(movie) {' +
                    'var card = document.createElement("div");' +
                    'card.className = "movie-card";' +
                    
                    'var img = document.createElement("img");' +
                    'img.src = movie.img || movie.movie_image;' +
                    'img.alt = movie.movie_title;' +
                    'img.className = "movie-image";' +
                    
                    'var title = document.createElement("div");' +
                    'title.className = "movie-title";' +
                    'title.textContent = movie.movie_title;' +
                    
                    'var rating = document.createElement("div");' +
                    'rating.className = "movie-rating";' +
                    'rating.textContent = "Rating: " + (movie.rate || movie.movie_rate);' +
                    
                    'var release = document.createElement("div");' +
                    'release.className = "movie-release";' +
                    'release.textContent = "Release Date: " + (movie.release_date || movie.movie_release_date);' +
                    
                    'var overview = document.createElement("div");' +
                    'overview.className = "movie-overview";' +
                    'overview.textContent = movie.movie_overview || "No overview available";' +
                    'overview.style.display = "none";' +
                    
                    'card.addEventListener("click", function() {' +
                        'window.location.href = "/movies/" + movie.movie_id;' +
                    '});' +
                    
                    'card.addEventListener("mouseover", function() {' +
                        'overview.style.display = "block";' +
                    '});' +
                    
                    'card.addEventListener("mouseout", function() {' +
                        'overview.style.display = "none";' +
                    '});' +
                    
                    'card.appendChild(img);' +
                    'card.appendChild(title);' +
                    'card.appendChild(rating);' +
                    'card.appendChild(release);' +
                    'card.appendChild(overview);' +
                    
                    'return card;' +
                '}' +
                
                // 필터링 및 정렬 함수
                'var filteredMovies = allMovies.slice();' +
                'var currentIndex = 0;' +
                'var BATCH_SIZE = 5;' +
                
                'function clearMovies() {' +
                    'document.querySelector(".movies-group").innerHTML = "";' +
                    'currentIndex = 0;' +
                '}' +
                
                'function loadBatch() {' +
                    'var group = document.querySelector(".movies-group");' +
                    'var batch = filteredMovies.slice(currentIndex, currentIndex + BATCH_SIZE);' +
                    'for (var i = 0; i < batch.length; i++) {' +
                        'var card = createMovieCard(batch[i]);' +
                        'group.appendChild(card);' +
                    '}' +
                    'currentIndex += BATCH_SIZE;' +
                '}' +
                
                'function applyFiltersAndSort() {' +
                    'var keyword = document.getElementById("searchInput").value.toLowerCase();' +
                    'var sortValue = document.getElementById("sortSelect").value;' +
                    
                    'filteredMovies = [];' +
                    'for (var i = 0; i < allMovies.length; i++) {' +
                        'var movie = allMovies[i];' +
                        'if (movie.movie_title.toLowerCase().indexOf(keyword) !== -1) {' +
                            'filteredMovies.push(movie);' +
                        '}' +
                    '}' +
                    
                    'if (sortValue === "title-asc") {' +
                        'filteredMovies.sort(function(a, b) {' +
                            'return a.movie_title.localeCompare(b.movie_title);' +
                        '});' +
                    '} else if (sortValue === "title-desc") {' +
                        'filteredMovies.sort(function(a, b) {' +
                            'return b.movie_title.localeCompare(a.movie_title);' +
                        '});' +
                    '} else if (sortValue === "rating-asc") {' +
                        'filteredMovies.sort(function(a, b) {' +
                            'return (a.rate || a.movie_rate) - (b.rate || b.movie_rate);' +
                        '});' +
                    '} else if (sortValue === "rating-desc") {' +
                        'filteredMovies.sort(function(a, b) {' +
                            'return (b.rate || b.movie_rate) - (a.rate || a.movie_rate);' +
                        '});' +
                    '}' +
                    
                    'clearMovies();' +
                    'loadBatch();' +
                '}' +
                
                'function checkScroll() {' +
                    'if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {' +
                        'if (currentIndex < filteredMovies.length) {' +
                            'loadBatch();' +
                        '}' +
                    '}' +
                '}' +
                
                // 이벤트 리스너 설정
                'document.getElementById("searchInput").addEventListener("input", applyFiltersAndSort);' +
                'document.getElementById("sortSelect").addEventListener("change", applyFiltersAndSort);' +
                'window.addEventListener("scroll", checkScroll);' +
                
                // 초기 로드
                'applyFiltersAndSort();' +
            '</script>' +
        '</body>' +
        '</html>';
        
        // HTML 전송
        res.send(output);
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Database error');
    }
});

// Individual movie page - using JSON for reviews instead of SQLite
app.get('/movies/:movieId', async function(req, res) {
    try {
        const movieId = req.params.movieId;
        let db = await getDBConnection();
        
        // Get movie details from SQLite
        let movie = await db.get('SELECT * FROM movies WHERE movie_id = ?', movieId);
        
        await db.close();
        
        if (!movie) {
            return res.status(404).send('Movie not found');
        }
        
        // Debug: Log the movie object to see what fields are available
        console.log('Movie data:', movie);
        
        // Get reviews from JSON file instead of database
        let reviews = [];
        try {
            const allComments = readCommentsFile();
            reviews = allComments.filter(comment => comment.movie_id == movieId);
        } catch (e) {
            console.log('Comments file not found or empty');
        }
        
        // Helper function to escape HTML and handle undefined values
        function escapeHtml(text) {
            if (!text) return '';
            return text.toString()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
        
        // Build reviews HTML
        let reviewsHtml = '';
        if (reviews.length > 0) {
            for (let i = 0; i < reviews.length; i++) {
                const reviewDate = reviews[i].timestamp ? new Date(reviews[i].timestamp).toLocaleDateString() : new Date().toLocaleDateString();
                reviewsHtml += '<div class="review-item">' +
                    '<div class="review-rating">평점: ' + (reviews[i].rating || '5') + '점</div>' +
                    '<div class="review-text">' + escapeHtml(reviews[i].comment_text || reviews[i].review_content) + '</div>' +
                    '<div class="review-date">' + reviewDate + '</div>' +
                '</div>';
            }
        } else {
            reviewsHtml = '<p>아직 후기가 없습니다. 첫 번째 후기를 작성해보세요!</p>';
        }
        
        // Use the correct column names from your database
        const movieTitle = movie.movie_title || 'Unknown Title';
        const movieImage = movie.img || movie.movie_image || '/placeholder-movie.jpg';
        const movieRating = movie.rate || movie.movie_rate || 'N/A';
        const movieRelease = movie.release_date || movie.movie_release_date || 'Unknown';
        
        const movieOverview = movie.movie_overview;
        
        // Generate individual movie page 
        var output = 
        '<!DOCTYPE html>' +
        '<html lang="en">' +
        '<head>' +
            '<meta charset="UTF-8">' +
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
            '<title>' + escapeHtml(movieTitle) + ' - Movie Details</title>' +
            '<link rel="stylesheet" href="/main.css">' +
            '<style>' +
                '.movie-detail { max-width: 1020px; margin: 0 auto; padding: 20px; }' +
                '.movie-info { display: flex; gap: 30px; margin-bottom: 30px; flex-wrap: wrap; }' +
                '.movie-poster { width: 300px; height: 450px; object-fit: cover; border-radius: 8px; }' +
                '.movie-details { flex: 1; min-width: 300px; }' +
                '.movie-title { font-size: 2rem; margin-bottom: 10px; color: #333; }' +
                '.movie-rating { font-size: 1.2rem; color: #ff6b35; margin-bottom: 10px; font-weight: bold; }' +
                '.movie-release { font-size: 1rem; color: #666; margin-bottom: 20px; }' +
                '.movie-overview { font-size: 1rem; line-height: 1.6; color: #333; background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; }' +
                '.reviews-section { margin-top: 40px; }' +
                '.review-form { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }' +
                '.review-form h3 { margin-bottom: 15px; color: #333; }' +
                '.review-form label { font-weight: bold; margin-bottom: 5px; display: inline-block; }' +
                '.review-form select, .review-form textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; }' +
                '.review-form textarea { resize: vertical; height: 100px; }' +
                '.review-form button { background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px; margin-top: 15px; }' +
                '.review-form button:hover { background: #0056b3; }' +
                '.review-form button:disabled { background: #ccc; cursor: not-allowed; }' +
                '.review-item { border-bottom: 1px solid #eee; padding: 15px 0; }' +
                '.review-rating { color: #ff6b35; font-weight: bold; margin-bottom: 8px; }' +
                '.review-text { margin: 10px 0; line-height: 1.5; }' +
                '.review-date { color: #666; font-size: 0.9rem; }' +
                '.back-button { background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-bottom: 20px; text-decoration: none; display: inline-block; }' +
                '.back-button:hover { background: #545b62; }' +
                '.debug-info { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 10px 0; border-radius: 4px; font-family: monospace; font-size: 0.9rem; }' +
                '@media (max-width: 768px) { .movie-info { flex-direction: column; } .movie-poster { width: 100%; max-width: 400px; height: auto; } }' +
            '</style>' +
        '</head>' +
        '<body>' +
            '<div class="movie-detail">' +
                '<nav class="navbar">' +
                    '<a href="/">메인페이지</a>' +
                    '<a href="/login">로그인</a>' +
                    '<a href="/signup">회원가입</a>' +
                '</nav>' +
                
                '<a href="/" class="back-button">← 영화 목록으로 돌아가기</a>' +
                
                '<div class="movie-info">' +
                    '<img class="movie-poster" src="' + escapeHtml(movieImage) + '" alt="' + escapeHtml(movieTitle) + '" onerror="this.src=\'/placeholder-movie.jpg\'">' +
                    '<div class="movie-details">' +
                        '<h1 class="movie-id">' + 'Movie Id: ' + escapeHtml(movieId) + '</h1>' +
                        '<h1 class="movie-title">' + escapeHtml(movieTitle) + '</h1>' +
                        '<div class="movie-rating">평점: ' + escapeHtml(movieRating.toString()) + '/10</div>' +
                        '<div class="movie-release">개봉일: ' + '<p>' + escapeHtml(movieRelease) + '</p>' +  '<p>' +movieOverview +  '</p>' +'</div>' +

                    '</div>' +
                '</div>' +
                
                '<div class="reviews-section">' +
                    '<h2>영화 후기 (' + reviews.length + '개)</h2>' +
                    
                    '<div class="review-form">' +
                        '<h3>새로운 후기 추가</h3>' +
                        '<form id="reviewForm">' +
                            '<div style="margin-bottom: 15px;">' +
                                '<label for="reviewRating">평점:</label><br>' +
                                '<select id="reviewRating" required>' +
                                    '<option value="">선택하세요</option>' +
                                    '<option value="1">1점</option>' +
                                    '<option value="2">2점</option>' +
                                    '<option value="3">3점</option>' +
                                    '<option value="4">4점</option>' +
                                    '<option value="5">5점</option>' +
                                    '<option value="6">6점</option>' +
                                    '<option value="7">7점</option>' +
                                    '<option value="8">8점</option>' +
                                    '<option value="9">9점</option>' +
                                    '<option value="10">10점</option>' +
                                '</select>' +
                            '</div>' +
                            '<div style="margin-bottom: 15px;">' +
                                '<label for="reviewText">후기:</label><br>' +
                                '<textarea id="reviewText" placeholder="영화에 대한 후기를 작성해주세요..." required maxlength="1000"></textarea>' +
                            '</div>' +
                            '<button type="submit" id="submitBtn">후기 등록</button>' +
                        '</form>' +
                    '</div>' +
                    
                    '<div id="reviewsList">' +
                        reviewsHtml +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            '<script>' +
                'console.log("Movie detail page loaded");' +
                'var currentMovie = ' + JSON.stringify(movie) + ';' +
                'console.log("Current movie:", currentMovie);' +
                'console.log("Available movie fields:", Object.keys(currentMovie));' +
                
                // Handle review submission - save to JSON only
                'document.getElementById("reviewForm").addEventListener("submit", function(e) {' +
                    'e.preventDefault();' +
                    'console.log("Form submitted");' +
                    
                    'var reviewText = document.getElementById("reviewText").value.trim();' +
                    'var reviewRating = document.getElementById("reviewRating").value;' +
                    'var submitBtn = document.getElementById("submitBtn");' +
                    
                    'if (!reviewText) {' +
                        'alert("후기 내용을 입력해주세요.");' +
                        'return;' +
                    '}' +
                    
                    'if (!reviewRating) {' +
                        'alert("평점을 선택해주세요.");' +
                        'return;' +
                    '}' +
                    
                    // Disable button during submission
                    'submitBtn.disabled = true;' +
                    'submitBtn.textContent = "등록 중...";' +
                    
                    'console.log("Submitting review:", { text: reviewText, rating: reviewRating });' +
                    
                    // Create request data for JSON API
                    'var requestData = {' +
                        'movie_id: currentMovie.movie_id,' +
                        'comment_text: reviewText,' +
                        'rating: parseInt(reviewRating)' +
                    '};' +
                    
                    'console.log("Request data:", requestData);' +
                    
                    'var xhr = new XMLHttpRequest();' +
                    'xhr.open("POST", "/api/comments", true);' +
                    'xhr.setRequestHeader("Content-Type", "application/json");' +
                    
                    'xhr.onreadystatechange = function() {' +
                        'if (xhr.readyState === 4) {' +
                            'submitBtn.disabled = false;' +
                            'submitBtn.textContent = "후기 등록";' +
                            
                            'console.log("Response status:", xhr.status);' +
                            'console.log("Response text:", xhr.responseText);' +
                            
                            'if (xhr.status === 200) {' +
                                'alert("후기가 성공적으로 등록되었습니다!");' +
                                'location.reload();' +
                            '} else {' +
                                'alert("후기 등록 중 오류가 발생했습니다. 다시 시도해주세요.");' +
                                'console.error("Error:", xhr.responseText);' +
                            '}' +
                        '}' +
                    '};' +
                    
                    'xhr.onerror = function() {' +
                        'submitBtn.disabled = false;' +
                        'submitBtn.textContent = "후기 등록";' +
                        'alert("네트워크 오류가 발생했습니다. 연결을 확인해주세요.");' +
                    '};' +
                    
                    'try {' +
                        'xhr.send(JSON.stringify(requestData));' +
                    '} catch (error) {' +
                        'console.error("Send error:", error);' +
                        'submitBtn.disabled = false;' +
                        'submitBtn.textContent = "후기 등록";' +
                        'alert("요청 전송 중 오류가 발생했습니다.");' +
                    '}' +
                '});' +
            '</script>' +
        '</body>' +
        '</html>';
        
        res.send(output);
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Database error: ' + error.message);
    }
});

// API endpoint to get comments from JSON file
app.get('/api/comments', (req, res) => {
    try {
        const movie_id = req.query.movie_id;
        let comments = readCommentsFile();
        
        if (movie_id) {
            comments = comments.filter(comment => comment.movie_id == movie_id);
        }
        
        res.json(comments);
    } catch (error) {
        console.error('Error reading comments:', error);
        res.status(500).json({ error: 'Failed to read comments' });
    }
});

// API endpoint to add comments to JSON file
app.post('/api/comments', (req, res) => {
    try {
        console.log('Adding comment to JSON file:', req.body);
        
        const { movie_id, comment_text, rating } = req.body;
        
        if (!movie_id || !comment_text) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Read existing comments
        let comments = readCommentsFile();
        
        // Create new comment
        const newComment = {
            id: comments.length > 0 ? Math.max(...comments.map(c => c.id || 0)) + 1 : 1,
            movie_id: parseInt(movie_id),
            comment_text: comment_text.trim(),
            rating: parseInt(rating) || 5,
            timestamp: new Date().toISOString()
        };
        
        // Add to comments
        comments.push(newComment);
        
        // Save to file
        const saveSuccess = writeCommentsFile(comments);
        
        if (saveSuccess) {
            res.json({ success: true, comment: newComment });
        } else {
            res.status(500).json({ error: 'Failed to save comment' });
        }
        
    } catch (error) {
        console.error('Error adding comment to JSON:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// 기타 라우트들
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/signup.html');
});

// API 엔드포인트 
app.get('/api/movies', async (req, res) => {
    try {
        const searchKeyword = req.query.search || '';
        let db = await getDBConnection();
        
        let query = 'SELECT * FROM movies';
        let params = [];
        
        if (searchKeyword) {
            query += ' WHERE movie_title LIKE ?';
            params.push(`%${searchKeyword}%`);
        }
        
        let movies = await db.all(query, params);
        await db.close();
        
        res.json(movies);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// 서버 포트 설정
var port = 3000;
// 시작
app.listen(port, function(){
    console.log('server on! http://localhost:' + port);
});