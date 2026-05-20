USE innovevents;
INSERT INTO users(email,password_hash,firstname,lastname,username,role,must_change_password) VALUES
('chloe@innovevents.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Chloé', 'Martin', 'chloe.admin', 'ADMIN', false),
('jose@innovevents.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'José', 'Garcia', 'jose.employee', 'EMPLOYEE', false),
('client@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Alice', 'Durand', 'alice.client', 'CLIENT', false);
INSERT INTO clients(user_id,company_name,firstname,lastname,email,phone,address) VALUES
(3,'ACME','Alice','Durand','client@example.com','0600000000','10 rue Exemple, Paris');
INSERT INTO events(client_id,name,start_at,end_at,location,type,theme,status,is_public,image_url) VALUES
(1,'Séminaire leadership','2026-06-20 09:00:00','2026-06-20 18:00:00','Paris','Séminaire','Leadership','ACCEPTE',true,'/assets/event.jpg');
