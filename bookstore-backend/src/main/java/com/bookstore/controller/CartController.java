package com.bookstore.controller;

import com.bookstore.dto.CartDtos.*;
import com.bookstore.security.CustomUserDetails;
import com.bookstore.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<CartResponse> getCart(@AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(cartService.getCart(principal.getUser()));
    }

    @PostMapping
    public ResponseEntity<CartResponse> addToCart(@AuthenticationPrincipal CustomUserDetails principal,
                                                    @Valid @RequestBody AddToCartRequest request) {
        return ResponseEntity.ok(cartService.addToCart(principal.getUser(), request));
    }

    @PutMapping("/{bookId}")
    public ResponseEntity<CartResponse> updateQuantity(@AuthenticationPrincipal CustomUserDetails principal,
                                                         @PathVariable Long bookId,
                                                         @Valid @RequestBody UpdateCartRequest request) {
        return ResponseEntity.ok(cartService.updateQuantity(principal.getUser(), bookId, request));
    }

    @DeleteMapping("/{bookId}")
    public ResponseEntity<CartResponse> removeFromCart(@AuthenticationPrincipal CustomUserDetails principal,
                                                         @PathVariable Long bookId) {
        return ResponseEntity.ok(cartService.removeFromCart(principal.getUser(), bookId));
    }

    @DeleteMapping
    public ResponseEntity<Void> clearCart(@AuthenticationPrincipal CustomUserDetails principal) {
        cartService.clearCart(principal.getUser());
        return ResponseEntity.noContent().build();
    }
}
