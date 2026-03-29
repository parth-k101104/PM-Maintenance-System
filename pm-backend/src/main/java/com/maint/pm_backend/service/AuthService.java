package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.LoginRequest;
import com.maint.pm_backend.dto.LoginResponse;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.entity.Role;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

import com.maint.pm_backend.security.CustomUserDetailsService;
import com.maint.pm_backend.security.JwtUtils;
import org.springframework.security.core.userdetails.UserDetails;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final EmployeeRepository employeeRepository;
    private final RoleRepository roleRepository;
    private final JwtUtils jwtUtils;
    private final CustomUserDetailsService userDetailsService;

    public LoginResponse login(LoginRequest request) {
        Optional<Employee> employeeOpt = employeeRepository.findByEmail(request.getEmail());

        if (employeeOpt.isPresent()) {
            Employee employee = employeeOpt.get();
            // Assuming plain text passwords for now. Should use PasswordEncoder in production.
            if (employee.getPassword() != null && employee.getPassword().equals(request.getPassword())) {
                if (employee.getActive() != null && !employee.getActive()) {
                    throw new RuntimeException("Account is inactive");
                }
                
                Map<String, Object> permissions = null;
                if (employee.getRoleId() != null) {
                    Optional<Role> roleOpt = roleRepository.findById(employee.getRoleId());
                    if (roleOpt.isPresent()) {
                        permissions = roleOpt.get().getPermissions();
                    }
                }
                
                UserDetails userDetails = userDetailsService.loadUserByUsername(employee.getEmail());
                String token = jwtUtils.generateToken(userDetails, employee.getEmployeeId(), employee.getRoleId());
                
                return LoginResponse.builder()
                        .message("Login successful")
                        .token(token)
                        .employeeId(employee.getEmployeeId())
                        .fullName(employee.getFullName())
                        .roleId(employee.getRoleId())
                        .permissions(permissions)
                        .build();
            }
        }

        
        throw new RuntimeException("Invalid email or password");
    }
}
