package com.bookstore.service;

import com.bookstore.dto.CartDtos.*;
import com.bookstore.entity.Book;
import com.bookstore.entity.CartItem;
import com.bookstore.entity.User;
import com.bookstore.exception.BadRequestException;
import com.bookstore.exception.ResourceNotFoundException;
import com.bookstore.repository.CartItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final BookService bookService;

    @Transactional
    public CartResponse addToCart(User user, AddToCartRequest request) {
        Book book = bookService.findEntity(request.getBookId());

        if (book.getStockQuantity() < request.getQuantity()) {
            throw new BadRequestException("Not enough stock for '" + book.getTitle() + "'. Available: " + book.getStockQuantity());
        }

        CartItem item = cartItemRepository.findByUserIdAndBookId(user.getId(), book.getId())
                .orElse(CartItem.builder().user(user).book(book).quantity(0).build());

        int newQty = item.getQuantity() + request.getQuantity();
        if (book.getStockQuantity() < newQty) {
            throw new BadRequestException("Not enough stock for '" + book.getTitle() + "'. Available: " + book.getStockQuantity());
        }
        item.setQuantity(newQty);
        cartItemRepository.save(item);

        return getCart(user);
    }

    @Transactional(readOnly = true)
    public CartResponse getCart(User user) {
        List<CartItem> items = cartItemRepository.findByUserId(user.getId());

        List<CartItemResponse> responses = items.stream().map(this::toResponse).toList();
        BigDecimal total = responses.stream()
                .map(CartItemResponse::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CartResponse.builder().items(responses).total(total).build();
    }

    @Transactional
    public CartResponse updateQuantity(User user, Long bookId, UpdateCartRequest request) {
        CartItem item = cartItemRepository.findByUserIdAndBookId(user.getId(), bookId)
                .orElseThrow(() -> new ResourceNotFoundException("This book is not in your cart"));

        if (item.getBook().getStockQuantity() < request.getQuantity()) {
            throw new BadRequestException("Not enough stock. Available: " + item.getBook().getStockQuantity());
        }

        item.setQuantity(request.getQuantity());
        cartItemRepository.save(item);
        return getCart(user);
    }

    @Transactional
    public CartResponse removeFromCart(User user, Long bookId) {
        cartItemRepository.findByUserIdAndBookId(user.getId(), bookId)
                .orElseThrow(() -> new ResourceNotFoundException("This book is not in your cart"));
        cartItemRepository.deleteByUserIdAndBookId(user.getId(), bookId);
        return getCart(user);
    }

    @Transactional
    public void clearCart(User user) {
        cartItemRepository.deleteByUserId(user.getId());
    }

    private CartItemResponse toResponse(CartItem item) {
        BigDecimal subtotal = item.getBook().getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
        return CartItemResponse.builder()
                .id(item.getId())
                .bookId(item.getBook().getId())
                .bookTitle(item.getBook().getTitle())
                .bookImageUrl(item.getBook().getImageUrl())
                .price(item.getBook().getPrice())
                .quantity(item.getQuantity())
                .subtotal(subtotal)
                .build();
    }
}
