SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: app_admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."app_admins" ("user_id", "note") VALUES
	('3e5aadee-9c2e-4de9-94f8-122355f7e249', 'Admin principal');


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "email", "full_name", "role", "created_at", "updated_at") VALUES
	('3e5aadee-9c2e-4de9-94f8-122355f7e249', 'adilson.martins.jlle@gmail.com', 'Adilson Martins', 'ADMIN', '2025-09-12 18:12:34.725231+00', '2025-09-14 02:37:58.493121+00'),
	('713197eb-f34d-4572-84d5-b7faeaa4ceab', 'ju.aimi81@gmail.com', 'jucelia Aimi Martins', 'LEADER', '2025-09-14 21:46:41.503725+00', '2025-09-14 22:10:40.980649+00');


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: city_goals; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: election_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."election_settings" ("id", "election_name", "election_date", "timezone", "election_type", "uf", "city", "created_at", "updated_at", "election_level", "scope_state", "scope_city", "scope_city_ibge") VALUES
	('8039396c-0746-44b8-aa83-ddcc1ff80634', 'Eleição Estadual 2026', '2026-10-06', 'America/Sao_Paulo', 'ESTADUAL', 'SC', NULL, '2025-09-14 19:17:31.038324+00', '2025-09-14 20:28:07.04688+00', 'ESTADUAL', 'SC', NULL, NULL);


--
-- Data for Name: invite_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."invite_tokens" ("id", "email", "full_name", "phone", "role", "token", "expires_at", "created_by", "accepted_at", "leader_profile_id", "created_at", "data") VALUES
	('bb646312-b967-4613-95ec-4b7be79ce1ea', 'ju.aimi81@gmail.com', 'jucelia Aimi Martins', NULL, 'LEADER', '260f2ac0-f51e-4e87-b506-29bcd6100dcd', '2025-09-21 21:46:43.471+00', '3e5aadee-9c2e-4de9-94f8-122355f7e249', NULL, '713197eb-f34d-4572-84d5-b7faeaa4ceab', '2025-09-14 21:46:43.504547+00', NULL);


--
-- Data for Name: leader_areas; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: leader_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."leader_profiles" ("id", "email", "phone", "birth_date", "gender", "cep", "street", "number", "complement", "neighborhood", "city", "state", "notes", "status", "latitude", "longitude", "created_at", "updated_at", "goal", "accepted_at") VALUES
	('713197eb-f34d-4572-84d5-b7faeaa4ceab', 'ju.aimi81@gmail.com', '47992292522', '1981-05-11', 'F', '89221330', 'Rua Itapiranga', '83', NULL, 'Saguaçu', 'Joinville', 'Santa Catarina', NULL, 'ACTIVE', -26.2818874, -48.8413573, '2025-09-14 21:46:41.503725+00', '2025-09-14 22:10:40.927702+00', 100, '2025-09-14 22:01:24.132484+00');


--
-- Data for Name: neighborhood_goals; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: org_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."org_settings" ("id", "default_goal", "organization_name", "created_at", "updated_at") VALUES
	(1, 100, 'Organização Política', '2025-09-12 15:36:15.779223+00', '2025-09-13 10:02:11.157633+00');


--
-- Data for Name: people; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."people" ("id", "owner_id", "full_name", "whatsapp", "email", "facebook", "instagram", "cep", "street", "number", "complement", "neighborhood", "city", "state", "notes", "latitude", "longitude", "vote_status", "contacted_at", "created_at", "updated_at") VALUES
	('c9667d1b-1d9a-4b42-b6ac-f90f152dab5d', '3e5aadee-9c2e-4de9-94f8-122355f7e249', 'Alessandro Higino Viana', '4788566699', NULL, NULL, NULL, '89226827', 'Rua Tim Maia', '113', NULL, 'Vila Cubatão', 'Joinville', NULL, NULL, NULL, NULL, 'PROVAVEL', NULL, '2025-09-14 19:07:20.611831+00', '2025-09-14 19:07:43.166211+00'),
	('87f3c1f9-2b03-4b36-8586-6a35c7adce55', '3e5aadee-9c2e-4de9-94f8-122355f7e249', 'Eidi Ferraz Dias', '4796457846', NULL, NULL, NULL, '89227322', 'Rua Canoas', '', NULL, 'Jardim Iririú', 'Joinville', NULL, NULL, NULL, NULL, 'INDEFINIDO', NULL, '2025-09-14 19:08:42.34958+00', '2025-09-14 19:08:42.34958+00'),
	('afb52e64-da55-47f4-a0ff-d80b68c8b19b', '3e5aadee-9c2e-4de9-94f8-122355f7e249', 'Celso Pederssetti', '4797550148', NULL, NULL, NULL, '89226350', 'Rua Guilherme Klein', '321', NULL, 'Aventureiro', 'Joinville', 'SC', NULL, -26.2362171, -48.8123291, 'INDEFINIDO', NULL, '2025-09-14 19:08:01.191138+00', '2025-09-14 19:09:23.560613+00'),
	('ed0cbb26-dc70-45e6-9bdf-f8580c1a80f7', '3e5aadee-9c2e-4de9-94f8-122355f7e249', 'Felipe Moraes', '4784220315', NULL, NULL, NULL, '89226420', 'Rua Aveiro', '699', NULL, 'Aventureiro', 'Joinville', 'SC', NULL, -26.2364296, -48.8134343, 'INDEFINIDO', NULL, '2025-09-14 19:08:31.120882+00', '2025-09-14 19:09:33.29889+00'),
	('df723f9a-c6a2-40a2-b028-f6ab4193377f', '3e5aadee-9c2e-4de9-94f8-122355f7e249', 'Marcelo Martin (Q-Burgão)', '4791608989', NULL, NULL, NULL, '89227014', 'Rua Seara', '88', NULL, 'Iririú', 'Joinville', 'SC', NULL, -26.2784515, -48.83466550000001, 'INDEFINIDO', NULL, '2025-09-14 19:09:12.400696+00', '2025-09-14 19:09:40.91746+00'),
	('cc07efbe-ac3d-408e-9078-cf988c04da59', '3e5aadee-9c2e-4de9-94f8-122355f7e249', 'Solemar Pederssetti', '4799940858', NULL, NULL, NULL, '89226350', 'Rua Guilherme Klein', '321', NULL, 'Aventureiro', 'Joinville', 'SC', NULL, -26.2362171, -48.8123291, 'INDEFINIDO', NULL, '2025-09-14 19:07:48.158944+00', '2025-09-14 19:09:48.181376+00'),
	('ac9aa8e9-aa08-4649-9e06-8ea5e907b8c2', '3e5aadee-9c2e-4de9-94f8-122355f7e249', 'Ana Paula Poggere', '4788547456', NULL, NULL, NULL, '89227565', 'Rua Rocha Pombo', '', NULL, 'Jardim Iririú', 'Joinville', 'SC', NULL, NULL, NULL, 'INDEFINIDO', NULL, '2025-09-14 19:09:52.654706+00', '2025-09-14 19:09:52.654706+00'),
	('7b4aacd6-5ac9-4125-9a41-32b3b5092de1', '3e5aadee-9c2e-4de9-94f8-122355f7e249', 'Valney Bendlin', '4799959555', NULL, NULL, NULL, '89221585', 'Rua Turvo', '152', NULL, 'Saguaçu', 'Joinville', 'SC', NULL, -26.272801, -48.833423, 'INDEFINIDO', NULL, '2025-09-14 19:09:27.696365+00', '2025-09-14 19:09:55.762456+00'),
	('668a47bd-ce8e-4cca-91c9-47b8676803e5', '3e5aadee-9c2e-4de9-94f8-122355f7e249', 'Rubirlei Pederssetti', '4799158394', NULL, NULL, NULL, '89226350', 'Rua Guilherme Klein', '321', NULL, 'Aventureiro', 'Joinville', 'SC', NULL, -26.2362171, -48.8123291, 'CONFIRMADO', NULL, '2025-09-14 19:07:34.116686+00', '2025-09-14 19:14:34.968813+00'),
	('53c375e0-e162-4984-8330-69cc9857d897', '3e5aadee-9c2e-4de9-94f8-122355f7e249', 'Beto Casa Nova', '4797620650', NULL, NULL, NULL, '89226110', 'Rua Perdiz', '1000', NULL, 'Aventureiro', 'Joinville', NULL, NULL, NULL, NULL, 'CONFIRMADO', NULL, '2025-09-14 19:07:05.533009+00', '2025-09-14 19:14:34.968813+00'),
	('3bbbc711-335c-4af4-aaa4-e4613699ce28', '3e5aadee-9c2e-4de9-94f8-122355f7e249', 'ADILSON MARTINS', '47997583447', 'adilson.corretor85@gmail.com', '', '', '89221-330', 'Rua Itapiranga', '83', '', 'Saguaçu', 'Joinville', NULL, '', NULL, NULL, 'PROVAVEL', '2025-09-14 00:00:00+00', '2025-09-14 02:48:37.446076+00', '2025-09-14 19:14:34.968813+00');


--
-- Data for Name: profile_leaderships; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profile_leaderships" ("id", "profile_id", "role_code", "level", "reach_scope", "reach_size", "organization", "title", "extra", "created_at", "updated_at") VALUES
	('bd25302a-50b2-4861-bf70-2df1f32b711e', '713197eb-f34d-4572-84d5-b7faeaa4ceab', 'POL_ELEITO', NULL, NULL, NULL, 'Câmara Municipal de Joinville', 'Vereador (Em Mandato)', '{"office": "Vereador", "status": "Em Mandato"}', '2025-09-14 23:19:47.099671+00', '2025-09-14 23:19:47.099671+00');


--
-- Data for Name: public_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."public_settings" ("id", "organization_name", "default_goal", "election_name", "election_date", "timezone", "created_at", "updated_at", "election_level", "scope_state", "scope_city", "scope_city_ibge") VALUES
	(1, NULL, 100, 'Eleição Estadual 2026', '2026-10-06', 'America/Sao_Paulo', '2025-09-14 04:51:26.331809+00', '2025-09-14 20:28:07.04688+00', 'ESTADUAL', 'SC', NULL, NULL);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."audit_logs_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

RESET ALL;
