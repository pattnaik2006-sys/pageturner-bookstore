# Pageturner Books — Online Bookstore (Spring Boot + MySQL + JWT + Vanilla JS)

A full learning project covering **Spring Boot → JPA → MySQL → REST → relationships → authentication**,
with a working frontend on top.

```
.
├── bookstore-backend/     Spring Boot REST API (Java 17, Maven)
└── bookstore-frontend/    Vanilla HTML/CSS/JS single-page app
```

## Features

- User registration & login (JWT-based auth, BCrypt-hashed passwords)
- Browse books (paginated), filter by category, search by title/author
- Categories (CRUD, admin-only)
- Add to cart / update quantity / remove from cart
- Place order (validates stock, decrements inventory, clears cart)
- Order history (per-user) + admin view of all orders with status updates
- Admin: add / update / delete books and categories
- Role-based access control (`USER` vs `ADMIN`) enforced both at the URL level
  (Spring Security filter chain) and at the method level (`@PreAuthorize`)

## Architecture / what you'll learn

| Layer | What it shows |
|---|---|
| `entity/` | JPA entities and relationships: `User 1—* CartItem *—1 Book`, `Category 1—* Book`, `Order 1—* OrderItem *—1 Book`, `User 1—* Order` |
| `repository/` | Spring Data JPA repositories, a derived-query and a custom `@Query` for search |
| `dto/` | Request/response DTOs — never expose entities directly over REST |
| `service/` | Business logic: stock validation, cart totals, order placement transaction |
| `security/` | JWT generation/validation, a custom `UserDetailsService`, a `OncePerRequestFilter` |
| `config/SecurityConfig` | Stateless JWT security filter chain, CORS, per-URL and per-role rules |
| `controller/` | REST endpoints, split into public / authenticated / admin-only controllers |
| `exception/` | `@RestControllerAdvice` global error handling with consistent JSON error bodies |

## Prerequisites

- Java 17+
- Maven 3.8+ (or use the included wrapper if you add one)
- MySQL 8+ running locally

## Backend setup

1. **Create the database** (or let Hibernate do it — the datasource URL below already
   includes `createDatabaseIfNotExist=true`):
   ```sql
   CREATE DATABASE bookstore_db;
   ```

2. **Configure credentials** in `bookstore-backend/src/main/resources/application.properties`:
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/bookstore_db?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC
   spring.datasource.username=root
   spring.datasource.password=root
   ```
   Change `username`/`password` to match your local MySQL setup. For anything beyond local
   learning, move these (and `jwt.secret`) into environment variables instead of committing them.

3. **Run it**:
   ```bash
   cd bookstore-backend
   mvn spring-boot:run
   ```
   The API starts on `http://localhost:8080`.

4. **First run seeds sample data automatically** (see `config/DataSeeder.java`):
   - Admin login: `admin@bookstore.com` / `admin123`
   - 4 categories, 6 sample books

## API overview

Base URL: `http://localhost:8080/api`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | public | Create account, returns JWT |
| POST | `/auth/login` | public | Log in, returns JWT |
| GET | `/books?page=&size=&sortBy=&direction=` | public | Paginated book list |
| GET | `/books/search?keyword=&categoryId=` | public | Search/filter |
| GET | `/books/category/{id}` | public | Books in a category |
| GET | `/books/{id}` | public | Book detail |
| GET | `/categories` | public | List categories |
| GET | `/cart` | user | View cart |
| POST | `/cart` | user | Add `{bookId, quantity}` |
| PUT | `/cart/{bookId}` | user | Update `{quantity}` |
| DELETE | `/cart/{bookId}` | user | Remove item |
| DELETE | `/cart` | user | Clear cart |
| POST | `/orders` | user | Place order `{shippingAddress}` from current cart |
| GET | `/orders` | user | Your order history |
| GET | `/orders/{id}` | user | Order detail (owner or admin) |
| POST/PUT/DELETE | `/admin/books` `/admin/books/{id}` | admin | Manage catalog |
| POST/PUT/DELETE | `/admin/categories` `/admin/categories/{id}` | admin | Manage categories |
| GET | `/admin/orders` | admin | All orders |
| PATCH | `/admin/orders/{id}/status` | admin | Update `{status}` |

Authenticated requests need `Authorization: Bearer <token>` from the login/register response.

### Example: register + browse

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"secret123"}'

curl "http://localhost:8080/api/books?page=0&size=10"
```

## Frontend setup

The frontend is plain HTML/CSS/JS — no build step required.

1. Make sure the backend is running on `http://localhost:8080` (edit `API_BASE` at the
   top of `bookstore-frontend/app.js` if you change the port).
2. Serve the folder with any static server, e.g.:
   ```bash
   cd bookstore-frontend
   python3 -m http.server 5500
   ```
   Then open `http://localhost:5500`.
3. If you use a different origin/port, add it to `app.cors.allowed-origins` in
   `application.properties` on the backend.

### What the frontend covers

- Browse grid with pagination, search bar + category filter in the header
- Book detail page with quantity selector
- Cart page: quantity +/-, remove, live total, checkout with shipping address
- Order history with status pills
- Login / register forms
- Admin dashboard (visible only to admin accounts): tabs for Books, Categories, Orders
  — full CRUD for books/categories via modal forms, and order status updates

\n## Important local setup notes\n\n- The backend uses Java 17+ and Maven. If `mvn` is not recognized on Windows, install Maven and add its `bin` directory to PATH, or use your IDE's Maven integration.\n- Make sure MySQL is running before starting Spring Boot. The default credentials are `root` / `root`; change them in `application.properties` if yours are different.\n- Open the frontend through a local HTTP server (for example VS Code Live Server or `python -m http.server 5500`) instead of double-clicking `index.html`.\n- The frontend expects the backend at `http://localhost:8080/api`.\n\n## Suggested next steps (once you're comfortable with this)

- Add refresh tokens / token expiry handling in the frontend (auto-logout on 401)
- Add pagination to admin tables, and book image upload instead of URL-only
- Add product reviews/ratings (new entity + relationship)
- Add Stripe/PayPal sandbox checkout instead of a "place order" button
- Write integration tests with `@SpringBootTest` + Testcontainers (real MySQL in CI)
- Containerize with Docker Compose (`app` + `mysql` services)
