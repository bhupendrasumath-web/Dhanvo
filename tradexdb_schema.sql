--
-- PostgreSQL database dump
--

\restrict lQ1wfC4YHNmmpxfbG31ahDb85d1Al8KcnhJ7ugBLDti8qxjjxuGWNBD4NOpsLYP

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: pan_kyc_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pan_kyc_checks (
    id bigint NOT NULL,
    pan character varying(10) NOT NULL,
    email character varying(255),
    phone character varying(10),
    verified boolean DEFAULT false NOT NULL,
    name character varying(120),
    kyc_status character varying(40),
    status_remark character varying(255),
    kra_name character varying(80),
    response_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pan_kyc_checks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pan_kyc_checks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pan_kyc_checks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pan_kyc_checks_id_seq OWNED BY public.pan_kyc_checks.id;


--
-- Name: signup_otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.signup_otps (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(10) NOT NULL,
    otp_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    attempts smallint DEFAULT 0 NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: signup_otps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.signup_otps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: signup_otps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.signup_otps_id_seq OWNED BY public.signup_otps.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(10) NOT NULL,
    password text NOT NULL,
    pan character varying(10),
    account_balance numeric(14,2) DEFAULT 0 NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    portfolio jsonb DEFAULT '[]'::jsonb NOT NULL,
    watchlist jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    nse_client_code character varying(50),
    nse_ucc_registered boolean DEFAULT false,
    nse_ucc_registered_at timestamp without time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: pan_kyc_checks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pan_kyc_checks ALTER COLUMN id SET DEFAULT nextval('public.pan_kyc_checks_id_seq'::regclass);


--
-- Name: signup_otps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signup_otps ALTER COLUMN id SET DEFAULT nextval('public.signup_otps_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: pan_kyc_checks pan_kyc_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pan_kyc_checks
    ADD CONSTRAINT pan_kyc_checks_pkey PRIMARY KEY (id);


--
-- Name: signup_otps signup_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signup_otps
    ADD CONSTRAINT signup_otps_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: pan_kyc_checks_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pan_kyc_checks_lookup_idx ON public.pan_kyc_checks USING btree (pan, created_at DESC);


--
-- Name: signup_otps_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX signup_otps_lookup_idx ON public.signup_otps USING btree (email, phone, created_at DESC);


--
-- Name: users_nse_client_code_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_nse_client_code_unique ON public.users USING btree (nse_client_code) WHERE (nse_client_code IS NOT NULL);


--
-- PostgreSQL database dump complete
--

\unrestrict lQ1wfC4YHNmmpxfbG31ahDb85d1Al8KcnhJ7ugBLDti8qxjjxuGWNBD4NOpsLYP

