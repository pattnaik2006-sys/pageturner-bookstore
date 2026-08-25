package com.bookstore.repository;

import com.bookstore.entity.Book;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookRepository extends JpaRepository<Book, Long> {

    Page<Book> findByCategoryId(Long categoryId, Pageable pageable);

    @Query("""
            SELECT b FROM Book b
            WHERE (:keyword IS NULL OR
                   LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
                   LOWER(b.author) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:categoryId IS NULL OR b.category.id = :categoryId)
            """)
    Page<Book> search(@Param("keyword") String keyword,
                       @Param("categoryId") Long categoryId,
                       Pageable pageable);
}
