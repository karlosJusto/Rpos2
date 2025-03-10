// Header.js
import React, { useState } from 'react';
import { Offcanvas, Button, Navbar, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Reloj from './pedidos/Reloj';

const Header = ({ title = 'Stock' }) => {
  const [show, setShow] = useState(false);

  // Función para alternar el estado del offcanvas
  const toggleOffcanvas = () => setShow(!show);

  return (
    <>
      {/* Navbar */}
      <Navbar bg="[#F3F3F3]">
        <Navbar.Brand href="#"></Navbar.Brand>

        {/* Botón de hamburguesa siempre visible */}
        <Button
          variant="outline-light"
          onClick={toggleOffcanvas}
          className="d-inline-block"
          style={{ fontSize: '1.6rem', color: 'gray' }}
        >
          ☰
        </Button>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto pr-3 pt-1 d-flex justify-content-between w-100">
            <div className="d-flex justify-content-center flex-grow-1">
              <h1 className="text-xl font-nunito font-extrabold text-gray-600">{title}</h1>
            </div>
            <Reloj />
          </Nav>
        </Navbar.Collapse>
      </Navbar>

      {/* Offcanvas */}
      <Offcanvas
        show={show}
        onHide={toggleOffcanvas}
        placement="start"
        style={{
          width: '120px',
          top: '68px',
          background: '#f2ac02',
          borderTopRightRadius: '30px',
          borderBottomRightRadius: '30px',
        }}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title></Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav>
            <ul className="ms-2 flex flex-col justify-between text-center items-center gap-10 bg-[#f2ac02]">
              <Link className="p-3 mt-2 hover:bg-gray-100 hover:rounded-2xl" to="/layout/comida">
                {/* Aquí va el SVG correspondiente */}
                <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#757575">
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"/>
                  <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>
                  <g id="SVGRepo_iconCarrier">
                    <path d="M22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M15 18H9" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/>
                  </g>
                </svg>
              </Link>

              {/* Agrega aquí los otros Links con sus respectivos SVG */}
              <Link className="p-3 mb-2 hover:bg-gray-100 hover:rounded-2xl" to="/login">
                <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"/>
                  <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>
                  <g id="SVGRepo_iconCarrier">
                    <path d="M15 12L2 12M2 12L5.5 9M2 12L5.5 15" stroke="#757575" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.00195 7C9.01406 4.82497 9.11051 3.64706 9.87889 2.87868C10.7576 2 12.1718 2 15.0002 2L16.0002 2C18.8286 2 20.2429 2 21.1215 2.87868C22.0002 3.75736 22.0002 5.17157 22.0002 8L22.0002 16C22.0002 18.8284 22.0002 20.2426 21.1215 21.1213C20.3531 21.8897 19.1752 21.9862 17 21.9983M9.00195 17C9.01406 19.175 9.11051 20.3529 9.87889 21.1213C10.5202 21.7626 11.4467 21.9359 13 21.9827" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/>
                  </g>
                </svg>
              </Link>
            </ul>
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default Header;
