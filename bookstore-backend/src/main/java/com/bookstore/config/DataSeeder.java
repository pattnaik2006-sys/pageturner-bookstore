package com.bookstore.config;

import com.bookstore.entity.Book;
import com.bookstore.entity.Category;
import com.bookstore.entity.Role;
import com.bookstore.entity.User;
import com.bookstore.repository.BookRepository;
import com.bookstore.repository.CategoryRepository;
import com.bookstore.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Seeds a default admin account and demo books
 * so the application is usable immediately.
 *
 * Default admin login:
 * Email: admin@bookstore.com
 * Password: admin123
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final BookRepository bookRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedAdmin();
        seedCatalog();
    }

    private void seedAdmin() {

        if (userRepository.existsByEmail("admin@bookstore.com")) {
            return;
        }

        User admin = User.builder()
                .name("Store Admin")
                .email("admin@bookstore.com")
                .password(passwordEncoder.encode("admin123"))
                .role(Role.ADMIN)
                .build();

        userRepository.save(admin);
    }

    private void seedCatalog() {

        // Don't create duplicate categories/books
        if (categoryRepository.count() > 0) {
            return;
        }

        Category fiction = categoryRepository.save(
                Category.builder()
                        .name("Fiction")
                        .description("Novels and imaginative storytelling")
                        .build()
        );

        Category nonFiction = categoryRepository.save(
                Category.builder()
                        .name("Non-Fiction")
                        .description("Real-world facts, essays and biographies")
                        .build()
        );

        Category scienceFi = categoryRepository.save(
                Category.builder()
                        .name("Science Fiction")
                        .description("Speculative and futuristic fiction")
                        .build()
        );

        Category tech = categoryRepository.save(
                Category.builder()
                        .name("Technology")
                        .description("Programming, engineering and computer science")
                        .build()
        );

        // --------------------------------------------------
        // BOOK 1
        // --------------------------------------------------

        bookRepository.save(
                Book.builder()
                        .title("The Silent Orchard")
                        .author("Maya Ellison")
                        .description(
                                "A quiet literary novel about family secrets in a small coastal town."
                        )
                        .price(new BigDecimal("14.99"))
                        .stockQuantity(25)
                        .imageUrl(
                                "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=420&fit=crop"
                        )
                        .category(fiction)
                        .build()
        );

        // --------------------------------------------------
        // BOOK 2
        // --------------------------------------------------

        bookRepository.save(
                Book.builder()
                        .title("Deep Work Habits")
                        .author("Callum Reyes")
                        .description(
                                "Practical strategies for focused, distraction-free productivity."
                        )
                        .price(new BigDecimal("19.50"))
                        .stockQuantity(40)
                        .imageUrl(
                                "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=420&fit=crop"
                        )
                        .category(nonFiction)
                        .build()
        );

        // --------------------------------------------------
        // BOOK 3
        // --------------------------------------------------

        bookRepository.save(
                Book.builder()
                        .title("Beyond the Event Horizon")
                        .author("Priya Nandakumar")
                        .description(
                                "A hard sci-fi epic spanning generations aboard a generation ship."
                        )
                        .price(new BigDecimal("17.25"))
                        .stockQuantity(30)
                        .imageUrl(
                                "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=300&h=420&fit=crop"
                        )
                        .category(scienceFi)
                        .build()
        );

        // --------------------------------------------------
        // BOOK 4
        // --------------------------------------------------

        bookRepository.save(
                Book.builder()
                        .title("Spring Boot in Practice")
                        .author("Daniel Osei")
                        .description(
                                "A hands-on guide to building production-ready REST APIs with Spring Boot."
                        )
                        .price(new BigDecimal("34.99"))
                        .stockQuantity(50)
                        .imageUrl(
                                "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=300&h=420&fit=crop"
                        )
                        .category(tech)
                        .build()
        );

        // --------------------------------------------------
        // BOOK 5
        // --------------------------------------------------

        bookRepository.save(
                Book.builder()
                        .title("Clean Architecture Basics")
                        .author("Louisa Marchetti")
                        .description(
                                "Foundational principles for organizing maintainable software systems."
                        )
                        .price(new BigDecimal("29.99"))
                        .stockQuantity(35)
                        .imageUrl(
                                "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&h=420&fit=crop"
                        )
                        .category(tech)
                        .build()
        );

        // --------------------------------------------------
        // BOOK 6
        // --------------------------------------------------

        bookRepository.save(
                Book.builder()
                        .title("The Last Lighthouse Keeper")
                        .author("Maya Ellison")
                        .description(
                                "A coming-of-age story set on a remote island lighthouse."
                        )
                        .price(new BigDecimal("12.99"))
                        .stockQuantity(20)
                        .imageUrl(
                                "https://images.unsplash.com/photo-1511108690759-009324a90311?w=300&h=420&fit=crop"
                        )
                        .category(fiction)
                        .build()
        );
    }
}