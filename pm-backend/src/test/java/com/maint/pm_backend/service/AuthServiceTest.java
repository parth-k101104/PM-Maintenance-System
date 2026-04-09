package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.LoginRequest;
import com.maint.pm_backend.dto.LoginResponse;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.entity.Role;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.repository.RoleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.ArrayList;

import com.maint.pm_backend.security.CustomUserDetailsService;
import com.maint.pm_backend.security.JwtUtils;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private CustomUserDetailsService userDetailsService;

    @Mock
    private JwtUtils jwtUtils;

    @InjectMocks
    private AuthService authService;

    @Test
    void login_ValidCredentials_ReturnsLoginResponse() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@example.com");
        request.setPassword("password123");

        Employee employee = new Employee();
        employee.setEmployeeId(1L);
        employee.setEmail("test@example.com");
        employee.setPassword("password123");
        employee.setFullName("Test User");
        employee.setRoleId(1L);
        employee.setActive(true);
        
        Role role = new Role();
        role.setRoleId(1L);
        role.setPermissions(Map.of("admin", true));

        UserDetails userDetails = new User("test@example.com", "password123", new ArrayList<>());
        when(employeeRepository.findByEmail(anyString())).thenReturn(Optional.of(employee));
        when(roleRepository.findById(anyLong())).thenReturn(Optional.of(role));
        when(userDetailsService.loadUserByUsername(anyString())).thenReturn(userDetails);
        when(jwtUtils.generateToken(any(UserDetails.class), eq(1L), eq(1L))).thenReturn("mocked-jwt-token");

        LoginResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("Login successful", response.getMessage());
        assertEquals(1L, response.getEmployeeId());
        assertEquals("Test User", response.getFullName());
        assertEquals(1L, response.getRoleId());
        assertNotNull(response.getPermissions());
        assertEquals(true, response.getPermissions().get("admin"));
        assertEquals("mocked-jwt-token", response.getToken());
    }

    @Test
    void login_InvalidPassword_ThrowsException() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@example.com");
        request.setPassword("wrongpassword");

        Employee employee = new Employee();
        employee.setEmail("test@example.com");
        employee.setPassword("password123");

        when(employeeRepository.findByEmail("test@example.com"))
                .thenReturn(Optional.of(employee));

        Exception exception = assertThrows(RuntimeException.class, () -> authService.login(request));
        assertEquals("Invalid email or password", exception.getMessage());
    }

    @Test
    void login_EmailNotFound_ThrowsException() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@example.com");
        request.setPassword("password123");

        when(employeeRepository.findByEmail("test@example.com"))
                .thenReturn(Optional.empty());

        Exception exception = assertThrows(RuntimeException.class, () -> authService.login(request));
        assertEquals("Invalid email or password", exception.getMessage());
    }

    @Test
    void login_InactiveAccount_ThrowsException() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@example.com");
        request.setPassword("password123");

        Employee employee = new Employee();
        employee.setEmail("test@example.com");
        employee.setPassword("password123");
        employee.setActive(false);

        when(employeeRepository.findByEmail("test@example.com"))
                .thenReturn(Optional.of(employee));

        Exception exception = assertThrows(RuntimeException.class, () -> authService.login(request));
        assertEquals("Account is inactive", exception.getMessage());
    }
}
