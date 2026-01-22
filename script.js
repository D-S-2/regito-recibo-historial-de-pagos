// Sistema de Gestión de Pagos - Bolivia
// JavaScript completo con todos los módulos funcionales

// ============================================
// CONFIGURACIÓN GLOBAL
// ============================================

const DB_NAME = 'sistema_pagos_bolivia_db';
let pagosRegistrados = JSON.parse(localStorage.getItem(DB_NAME)) || [];
let siguienteNumeroRecibo = 1;

// Variables globales
let modalTPV, modalTransferencia, modalQR;
let qrTimerInterval = null;

// Configuración para Bolivia
const CONFIG_BOLIVIA = {
    moneda: 'Bs.',
    bancos: {
        bisa: {
            nombre: 'Banco BISA',
            cuenta: '1001-2345-6789-00',
            tipo: 'Cuenta Corriente',
            color: '#E31837'
        },
        bnb: {
            nombre: 'Banco Nacional de Bolivia',
            cuenta: '1500-9876-5432-10',
            tipo: 'Cuenta Corriente',
            color: '#0055A4'
        },
        mercantil: {
            nombre: 'Banco Mercantil Santa Cruz',
            cuenta: '2001-8765-4321-00',
            tipo: 'Cuenta Corriente',
            color: '#FFD100'
        },
        economico: {
            nombre: 'Banco Económico',
            cuenta: '3001-1234-5678-90',
            tipo: 'Cuenta Ahorro',
            color: '#00A859'
        },
        fie: {
            nombre: 'Banco FIE',
            cuenta: '4001-5678-1234-00',
            tipo: 'Cuenta Corriente',
            color: '#6A1B9A'
        }
    }
};

// ============================================
// INICIALIZACIÓN DEL SISTEMA
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Sistema de Pagos Bolivia...');
    
    inicializarSistema();
    
    // Opcional: cargar datos de ejemplo para pruebas
    // cargarDatosEjemplo();
});

function inicializarSistema() {
    // Inicializar elementos DOM
    inicializarElementos();
    
    // Inicializar modales
    inicializarModales();
    
    // Configurar event listeners
    configurarEventListeners();
    
    // Cargar datos existentes
    cargarDatosIniciales();
    
    // Cargar historial
    cargarHistorial();
    
    console.log('✅ Sistema inicializado correctamente');
}

function inicializarElementos() {
    // Inicializar número de recibo
    if (pagosRegistrados.length > 0) {
        const ultimoRecibo = Math.max(...pagosRegistrados.map(p => p.numeroRecibo || 0));
        siguienteNumeroRecibo = ultimoRecibo + 1;
    }
}

function inicializarModales() {
    modalTPV = document.getElementById('modal-tpv');
    modalTransferencia = document.getElementById('modal-transferencia');
    modalQR = document.getElementById('modal-qr');
    
    // Configurar botones de cerrar
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', cerrarTodosModales);
    });
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            cerrarTodosModales();
        }
    });
}

function configurarEventListeners() {
    // Navegación por tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            cambiarTab(this.dataset.tab);
        });
    });
    
    // Formulario de registro de pago
    const formPago = document.getElementById('form-pago');
    if (formPago) {
        formPago.addEventListener('submit', registrarPago);
    }
    
    // Métodos de pago
    configurarMetodosPago();
    
    // Botones de recibo
    document.getElementById('generar-recibo')?.addEventListener('click', generarRecibo);
    document.getElementById('imprimir-recibo')?.addEventListener('click', imprimirRecibo);
    
    // Botones de historial
    document.getElementById('aplicar-filtros')?.addEventListener('click', cargarHistorial);
    
    // Botones dentro de los modales
    configurarBotonesModales();
}

function cargarDatosIniciales() {
    // Actualizar fecha en recibo
    const hoy = new Date();
    const fechaFormateada = hoy.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    const reciboFecha = document.getElementById('recibo-fecha');
    if (reciboFecha) {
        reciboFecha.textContent = fechaFormateada;
    }
    
    // Actualizar select de recibo
    actualizarSelectRecibo();
}

// ============================================
// FUNCIONALIDAD DE TABS
// ============================================

function cambiarTab(tabId) {
    // Remover clase active de todos los tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remover clase active de todos los contenidos
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Activar tab seleccionado
    const tabActivo = document.querySelector(`.tab[data-tab="${tabId}"]`);
    const contenidoActivo = document.getElementById(tabId);
    
    if (tabActivo && contenidoActivo) {
        tabActivo.classList.add('active');
        contenidoActivo.classList.add('active');
    }
    
    // Si se activa el historial, recargar datos
    if (tabId === 'historial') {
        cargarHistorial();
    }
}

// ============================================
// REGISTRO DE PAGOS
// ============================================

function registrarPago(event) {
    event.preventDefault();
    
    // Obtener valores del formulario
    const pacienteSelect = document.getElementById('paciente');
    const pacienteTexto = pacienteSelect.options[pacienteSelect.selectedIndex].text;
    const pacienteId = pacienteSelect.value;
    
    const monto = parseFloat(document.getElementById('monto').value);
    const metodo = document.querySelector('input[name="metodo"]:checked').value;
    const estado = document.querySelector('input[name="estado"]:checked').value;
    const descripcion = document.getElementById('descripcion').value;
    
    // Validaciones
    if (!pacienteId || pacienteId === '') {
        mostrarAlerta('❌ Por favor selecciona un paciente', 'error');
        return;
    }
    
    if (!monto || monto <= 0) {
        mostrarAlerta('❌ Por favor ingresa un monto válido', 'error');
        return;
    }
    
    // Crear objeto de pago
    const nuevoPago = {
        id: Date.now(),
        pacienteId: pacienteId,
        paciente: pacienteTexto,
        monto: monto,
        metodo: metodo,
        estado: estado,
        descripcion: descripcion,
        fecha: new Date().toISOString(),
        numeroRecibo: siguienteNumeroRecibo,
        fechaRegistro: new Date().toLocaleDateString('es-ES'),
        fechaCompleta: new Date().toLocaleString('es-ES')
    };
    
    // Agregar a la base de datos
    pagosRegistrados.push(nuevoPago);
    localStorage.setItem(DB_NAME, JSON.stringify(pagosRegistrados));
    
    // Incrementar número de recibo
    siguienteNumeroRecibo++;
    
    // Mostrar confirmación
    mostrarAlerta(`✅ Pago registrado exitosamente! Recibo: R-${nuevoPago.numeroRecibo.toString().padStart(3, '0')}`, 'success');
    
    // Resetear formulario
    event.target.reset();
    
    // Restaurar valores por defecto
    document.querySelector('input[name="metodo"][value="efectivo"]').checked = true;
    document.querySelector('input[name="estado"][value="pagado"]').checked = true;
    
    // Actualizar select de recibo
    actualizarSelectRecibo();
    
    // Si estamos en la pestaña de historial, actualizar
    if (document.getElementById('historial').classList.contains('active')) {
        cargarHistorial();
    }
}

// ============================================
// MÉTODOS DE PAGO
// ============================================

function configurarMetodosPago() {
    const radios = document.querySelectorAll('input[name="metodo"]');
    
    radios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'efectivo') return;
            
            const monto = document.getElementById('monto').value;
            if (!monto || parseFloat(monto) <= 0) {
                mostrarAlerta('❌ Primero ingresa un monto válido', 'error');
                this.checked = false;
                document.querySelector('input[name="metodo"][value="efectivo"]').checked = true;
                return;
            }
            
            switch(this.value) {
                case 'tpv':
                    abrirModalTPV();
                    break;
                case 'transferencia':
                    abrirModalTransferencia();
                    break;
                case 'qr':
                    abrirModalQR();
                    break;
            }
        });
    });
}

function configurarBotonesModales() {
    // TPV
    document.querySelector('.btn-confirmar')?.addEventListener('click', procesarPagoTPV);
    document.querySelector('.btn-cancelar')?.addEventListener('click', cancelarTPV);
    
    // Transferencia
    document.getElementById('banco-bolivia')?.addEventListener('change', actualizarDatosBanco);
    document.getElementById('copiar-referencia')?.addEventListener('click', copiarReferencia);
    document.getElementById('copiar-todo')?.addEventListener('click', copiarDatosCompletos);
    document.getElementById('confirmar-transferencia-bo')?.addEventListener('click', confirmarTransferencia);
    
    // QR
    document.getElementById('refresh-qr')?.addEventListener('click', generarCodigoQR);
    document.getElementById('verificar-pago')?.addEventListener('click', verificarPagoQR);
}

// ============================================
// TPV
// ============================================

function abrirModalTPV() {
    const monto = document.getElementById('monto').value;
    const montoFormateado = parseFloat(monto).toFixed(2);
    
    // Actualizar información en el modal
    document.getElementById('tpv-monto').textContent = `${CONFIG_BOLIVIA.moneda} ${montoFormateado}`;
    document.getElementById('tpv-fecha').textContent = new Date().toLocaleDateString('es-ES');
    document.getElementById('tpv-operacion').textContent = `TPV-${Date.now().toString().slice(-6)}`;
    
    // Resetear estado
    document.querySelector('.tpv-loading').style.display = 'block';
    document.querySelector('.tpv-success').style.display = 'none';
    document.querySelector('.tpv-error').style.display = 'none';
    
    // Mostrar modal
    abrirModal(modalTPV);
}

function procesarPagoTPV() {
    const loading = document.querySelector('.tpv-loading');
    const success = document.querySelector('.tpv-success');
    const error = document.querySelector('.tpv-error');
    
    // Mostrar carga
    loading.style.display = 'block';
    success.style.display = 'none';
    error.style.display = 'none';
    
    // Simular procesamiento
    setTimeout(() => {
        // 90% probabilidad de éxito, 10% de error
        const exito = Math.random() > 0.1;
        
        if (exito) {
            loading.style.display = 'none';
            success.style.display = 'flex';
            
            // Actualizar estado a PAGADO
            document.querySelector('input[name="estado"][value="pagado"]').checked = true;
            
            // Cerrar automáticamente después de 2 segundos
            setTimeout(() => {
                cerrarModal(modalTPV);
                mostrarAlerta('✅ Pago con TPV realizado exitosamente', 'success');
            }, 2000);
        } else {
            loading.style.display = 'none';
            error.style.display = 'flex';
            
            setTimeout(() => {
                error.style.display = 'none';
                loading.style.display = 'block';
            }, 3000);
        }
    }, 3000);
}

function cancelarTPV() {
    cerrarModal(modalTPV);
    
    // Deseleccionar TPV
    document.querySelector('input[name="metodo"][value="tpv"]').checked = false;
    document.querySelector('input[name="metodo"][value="efectivo"]').checked = true;
}

// ============================================
// TRANSFERENCIA BANCARIA
// ============================================

function abrirModalTransferencia() {
    const monto = document.getElementById('monto').value;
    const montoFormateado = parseFloat(monto).toFixed(2);
    
    // Actualizar información en el modal
    document.getElementById('monto-transferencia').textContent = `${CONFIG_BOLIVIA.moneda} ${montoFormateado}`;
    
    // Generar nueva referencia
    generarReferenciaPago();
    
    // Actualizar datos del banco
    actualizarDatosBanco();
    
    // Mostrar modal
    abrirModal(modalTransferencia);
}

function actualizarDatosBanco() {
    const selectBanco = document.getElementById('banco-bolivia');
    const bancoSeleccionado = selectBanco.value;
    const bancoInfo = CONFIG_BOLIVIA.bancos[bancoSeleccionado];
    
    if (bancoInfo) {
        document.getElementById('banco-nombre').textContent = bancoInfo.nombre;
        document.getElementById('cuenta-numero').textContent = bancoInfo.cuenta;
        document.getElementById('tipo-cuenta').textContent = bancoInfo.tipo;
        
        // Actualizar color del borde
        const bankDetails = document.querySelector('.bank-details');
        if (bankDetails) {
            bankDetails.style.borderLeftColor = bancoInfo.color;
        }
    }
}

function generarReferenciaPago() {
    const referencia = `REF-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    document.getElementById('codigo-referencia').textContent = referencia;
    return referencia;
}

function copiarReferencia() {
    const referencia = document.getElementById('codigo-referencia').textContent;
    
    // Usar Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(referencia)
            .then(() => {
                mostrarAlerta('✅ Referencia copiada al portapapeles', 'success');
            })
            .catch(err => {
                console.error('Error al copiar:', err);
                copiarFallback(referencia);
            });
    } else {
        copiarFallback(referencia);
    }
}

function copiarDatosCompletos() {
    const banco = document.getElementById('banco-nombre').textContent;
    const cuenta = document.getElementById('cuenta-numero').textContent;
    const monto = document.getElementById('monto-transferencia').textContent;
    const referencia = document.getElementById('codigo-referencia').textContent;
    
    const datosCompletos = `DATOS PARA TRANSFERENCIA BANCARIA

Banco: ${banco}
Cuenta: ${cuenta}
Tipo: Cuenta Corriente
Monto: ${monto}
Referencia: ${referencia}

Clínica Salud Bolivia
NIT: 12345678901

Instrucciones:
1. Realice la transferencia por el monto exacto
2. Use la referencia como concepto
3. Guarde el comprobante
4. El pago se confirmará en 24-48 horas`;
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(datosCompletos)
            .then(() => {
                mostrarAlerta('✅ Todos los datos copiados al portapapeles', 'success');
            })
            .catch(err => {
                console.error('Error al copiar:', err);
                copiarFallback(datosCompletos);
            });
    } else {
        copiarFallback(datosCompletos);
    }
}

function copiarFallback(texto) {
    const textarea = document.createElement('textarea');
    textarea.value = texto;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    try {
        document.execCommand('copy');
        mostrarAlerta('✅ Datos copiados al portapapeles', 'success');
    } catch (err) {
        console.error('Error al copiar:', err);
        mostrarAlerta('❌ No se pudo copiar al portapapeles', 'error');
    }
    
    document.body.removeChild(textarea);
}

function confirmarTransferencia() {
    // Cambiar estado a PENDIENTE
    document.querySelector('input[name="estado"][value="pendiente"]').checked = true;
    
    mostrarAlerta('✅ Transferencia registrada. Recuerde subir el comprobante cuando realice el pago.', 'success');
    cerrarModal(modalTransferencia);
}

// ============================================
// PAGO CON QR
// ============================================

function abrirModalQR() {
    const monto = document.getElementById('monto').value;
    
    if (!monto || parseFloat(monto) <= 0) {
        mostrarAlerta('❌ Por favor ingresa un monto válido para generar el QR', 'error');
        document.querySelector('input[name="metodo"][value="qr"]').checked = false;
        document.querySelector('input[name="metodo"][value="efectivo"]').checked = true;
        return;
    }
    
    // Generar código QR
    generarCodigoQR();
    
    // Iniciar temporizador
    iniciarTemporizadorQR();
    
    // Mostrar modal
    abrirModal(modalQR);
}

function generarCodigoQR() {
    const monto = document.getElementById('monto').value;
    const montoFormateado = parseFloat(monto).toFixed(2);
    const qrId = `QR-${Date.now().toString().slice(-6)}`;
    
    // Actualizar información
    document.getElementById('qr-monto').textContent = `${CONFIG_BOLIVIA.moneda} ${montoFormateado}`;
    document.getElementById('qr-id').textContent = qrId;
    
    // Generar visualización del QR
    const qrDisplay = document.getElementById('qr-code-display');
    qrDisplay.innerHTML = `
        <div style="text-align: center;">
            <div style="
                width: 180px;
                height: 180px;
                margin: 0 auto 15px;
                background: 
                    repeating-linear-gradient(0deg, #000, #000 4px, transparent 4px, transparent 8px),
                    repeating-linear-gradient(90deg, #000, #000 4px, transparent 4px, transparent 8px);
                border-radius: 10px;
                position: relative;
            ">
                <!-- Patrones de QR simulados -->
                <div style="position: absolute; top: 10px; left: 10px; width: 40px; height: 40px; background: #000; border-radius: 5px;"></div>
                <div style="position: absolute; top: 10px; right: 10px; width: 40px; height: 40px; background: #000; border-radius: 5px;"></div>
                <div style="position: absolute; bottom: 10px; left: 10px; width: 40px; height: 40px; background: #000; border-radius: 5px;"></div>
            </div>
            <div style="font-size: 14px; color: #333;">
                <div style="color: #666; margin-bottom: 5px;">Clínica Salud Bolivia</div>
                <div style="font-weight: bold; color: #4a6fa5; font-size: 16px;">${CONFIG_BOLIVIA.moneda} ${montoFormateado}</div>
                <div style="font-size: 12px; color: #888; margin-top: 5px;">ID: ${qrId}</div>
            </div>
        </div>
    `;
    
    // Resetear estado de pago
    document.getElementById('qr-status-pending').style.display = 'flex';
    document.getElementById('qr-status-success').style.display = 'none';
    
    // Reiniciar temporizador si ya estaba corriendo
    if (qrTimerInterval) {
        clearInterval(qrTimerInterval);
    }
    
    mostrarAlerta('✅ Código QR generado correctamente', 'success');
}

function iniciarTemporizadorQR() {
    let tiempoRestante = 15 * 60; // 15 minutos en segundos
    const timerElement = document.getElementById('qr-timer');
    
    if (!timerElement) return;
    
    function actualizarTemporizador() {
        const minutos = Math.floor(tiempoRestante / 60);
        const segundos = tiempoRestante % 60;
        
        timerElement.textContent = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
        
        if (tiempoRestante <= 0) {
            clearInterval(qrTimerInterval);
            qrTimerInterval = null;
            mostrarAlerta('⏰ El código QR ha expirado. Genera uno nuevo.', 'error');
            timerElement.textContent = '00:00';
            timerElement.style.color = '#dc3545';
        } else {
            tiempoRestante--;
            
            // Cambiar color cuando queden menos de 5 minutos
            if (tiempoRestante < 5 * 60) {
                timerElement.style.color = '#dc3545';
            } else if (tiempoRestante < 10 * 60) {
                timerElement.style.color = '#ffc107';
            }
        }
    }
    
    // Iniciar temporizador
    actualizarTemporizador();
    qrTimerInterval = setInterval(actualizarTemporizador, 1000);
}

function verificarPagoQR() {
    // Simular verificación de pago (70% probabilidad de éxito)
    const pagoExitoso = Math.random() > 0.3;
    
    if (pagoExitoso) {
        document.getElementById('qr-status-pending').style.display = 'none';
        document.getElementById('qr-status-success').style.display = 'flex';
        
        // Actualizar estado a PAGADO
        document.querySelector('input[name="estado"][value="pagado"]').checked = true;
        
        mostrarAlerta('✅ ¡Pago con QR confirmado exitosamente!', 'success');
        
        // Cerrar modal después de 3 segundos
        setTimeout(() => {
            cerrarModal(modalQR);
        }, 3000);
    } else {
        mostrarAlerta('⏳ Pago aún no confirmado. Intenta de nuevo en unos momentos.', 'info');
    }
}

// ============================================
// GESTIÓN DE RECIBOS
// ============================================

function actualizarSelectRecibo() {
    const selectReciboPaciente = document.getElementById('recibo-paciente-select');
    if (!selectReciboPaciente) return;
    
    selectReciboPaciente.innerHTML = '<option value="">-- Seleccione un pago registrado --</option>';
    
    pagosRegistrados.forEach(pago => {
        const option = document.createElement('option');
        option.value = pago.id;
        option.textContent = `Recibo R-${pago.numeroRecibo.toString().padStart(3, '0')} - ${pago.paciente} - ${CONFIG_BOLIVIA.moneda} ${pago.monto.toFixed(2)}`;
        selectReciboPaciente.appendChild(option);
    });
}

function generarRecibo() {
    const selectReciboPaciente = document.getElementById('recibo-paciente-select');
    const pagoId = parseInt(selectReciboPaciente.value);
    
    if (!pagoId) {
        mostrarAlerta('❌ Por favor selecciona un pago para generar el recibo', 'error');
        return;
    }
    
    // Buscar pago seleccionado
    const pago = pagosRegistrados.find(p => p.id === pagoId);
    
    if (!pago) {
        mostrarAlerta('❌ No se encontró el pago seleccionado', 'error');
        return;
    }
    
    // Actualizar información del recibo
    document.getElementById('recibo-numero').textContent = `R-${pago.numeroRecibo.toString().padStart(3, '0')}`;
    document.getElementById('recibo-fecha').textContent = formatearFecha(pago.fecha);
    document.getElementById('recibo-paciente').textContent = pago.paciente;
    document.getElementById('recibo-metodo').textContent = traducirMetodoPago(pago.metodo);
    document.getElementById('recibo-monto').textContent = `${CONFIG_BOLIVIA.moneda} ${pago.monto.toFixed(2)}`;
    
    // Habilitar botón de impresión
    document.getElementById('imprimir-recibo').disabled = false;
    
    // Efecto visual
    const reciboPreview = document.getElementById('recibo-preview');
    reciboPreview.classList.add('pulse');
    setTimeout(() => reciboPreview.classList.remove('pulse'), 500);
    
    mostrarAlerta('✅ Recibo generado exitosamente', 'success');
}

function imprimirRecibo() {
    const contenidoRecibo = document.getElementById('recibo-preview').innerHTML;
    const ventanaImpresion = window.open('', '_blank');
    
    ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recibo de Pago</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    color: #333;
                }
                .recibo-header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #000;
                    padding-bottom: 20px;
                }
                .recibo-header h3 {
                    font-size: 24px;
                    margin: 0;
                }
                .recibo-field {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #ddd;
                }
                .recibo-monto {
                    text-align: center;
                    margin: 30px 0;
                    padding: 20px;
                    background-color: #f5f5f5;
                    border: 1px solid #ddd;
                }
                .recibo-total {
                    font-size: 28px;
                    font-weight: bold;
                }
                @media print {
                    body { padding: 0; }
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            ${contenidoRecibo}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 1000);
                };
            </script>
        </body>
        </html>
    `);
    
    ventanaImpresion.document.close();
}

// ============================================
// HISTORIAL DE PAGOS
// ============================================

function cargarHistorial() {
    const filtroPaciente = document.getElementById('filtro-paciente').value;
    const filtroEstado = document.getElementById('filtro-estado').value;
    
    // Filtrar pagos
    let pagosFiltrados = [...pagosRegistrados];
    
    if (filtroPaciente) {
        pagosFiltrados = pagosFiltrados.filter(p => p.pacienteId === filtroPaciente);
    }
    
    if (filtroEstado) {
        pagosFiltrados = pagosFiltrados.filter(p => p.estado === filtroEstado);
    }
    
    // Ordenar por fecha (más reciente primero)
    pagosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    // Renderizar tabla
    renderizarHistorial(pagosFiltrados);
}

function renderizarHistorial(pagos) {
    const historialBody = document.getElementById('historial-body');
    if (!historialBody) return;
    
    historialBody.innerHTML = '';
    
    if (pagos.length === 0) {
        historialBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No se encontraron pagos con los filtros aplicados.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    pagos.forEach(pago => {
        const fila = document.createElement('tr');
        
        // Formatear método de pago
        const metodoTexto = traducirMetodoPago(pago.metodo);
        
        // Determinar clase de estado
        const estadoClase = pago.estado === 'pagado' ? 'paid' : 'pending';
        const estadoTexto = pago.estado === 'pagado' ? 'PAGADO' : 'PENDIENTE';
        const estadoIcono = pago.estado === 'pagado' ? 'check-circle' : 'clock';
        
        fila.innerHTML = `
            <td>${pago.fechaCompleta || formatearFecha(pago.fecha)}</td>
            <td>${pago.paciente}</td>
            <td><strong>${CONFIG_BOLIVIA.moneda} ${pago.monto.toFixed(2)}</strong></td>
            <td>${metodoTexto}</td>
            <td><span class="status-badge ${estadoClase}"><i class="fas fa-${estadoIcono}"></i> ${estadoTexto}</span></td>
            <td>R-${pago.numeroRecibo.toString().padStart(3, '0')}</td>
            <td class="acciones-historial">
                <button class="btn-sm btn-ver" onclick="verDetallePago(${pago.id})">
                    <i class="fas fa-eye"></i> Ver
                </button>
                <button class="btn-sm btn-imprimir" onclick="imprimirReciboPago(${pago.id})">
                    <i class="fas fa-print"></i> Recibo
                </button>
            </td>
        `;
        
        historialBody.appendChild(fila);
    });
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function abrirModal(modal) {
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function cerrarModal(modal) {
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Detener temporizador si existe
        if (qrTimerInterval) {
            clearInterval(qrTimerInterval);
            qrTimerInterval = null;
        }
    }
}

function cerrarTodosModales() {
    cerrarModal(modalTPV);
    cerrarModal(modalTransferencia);
    cerrarModal(modalQR);
}

function formatearFecha(fechaISO) {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function traducirMetodoPago(metodo) {
    const metodos = {
        'efectivo': 'Efectivo',
        'tpv': 'TPV (Tarjeta)',
        'transferencia': 'Transferencia Bancaria',
        'qr': 'QR Bolivia'
    };
    return metodos[metodo] || metodo;
}

function mostrarAlerta(mensaje, tipo = 'info') {
    // Eliminar alertas anteriores
    const alertasAnteriores = document.querySelectorAll('.alerta');
    alertasAnteriores.forEach(alerta => alerta.remove());
    
    // Crear elemento de alerta
    const alerta = document.createElement('div');
    alerta.className = `alerta alerta-${tipo}`;
    alerta.innerHTML = `
        <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${mensaje}</span>
        <button class="alerta-cerrar">&times;</button>
    `;
    
    // Agregar estilos si no existen
    if (!document.querySelector('#estilos-alerta')) {
        const estilos = document.createElement('style');
        estilos.id = 'estilos-alerta';
        estilos.textContent = `
            .alerta {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                gap: 15px;
                z-index: 2000;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                animation: slideIn 0.3s ease;
                max-width: 400px;
            }
            .alerta-success {
                background-color: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            .alerta-error {
                background-color: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            .alerta-info {
                background-color: #d1ecf1;
                color: #0c5460;
                border: 1px solid #bee5eb;
            }
            .alerta-cerrar {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                margin-left: auto;
                color: inherit;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(estilos);
    }
    
    document.body.appendChild(alerta);
    
    // Botón para cerrar alerta
    const btnCerrar = alerta.querySelector('.alerta-cerrar');
    btnCerrar.addEventListener('click', () => {
        alerta.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => alerta.remove(), 300);
    });
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        if (alerta.parentNode) {
            alerta.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => alerta.remove(), 300);
        }
    }, 5000);
}

// ============================================
// FUNCIONES GLOBALES PARA BOTONES
// ============================================

function verDetallePago(id) {
    const pago = pagosRegistrados.find(p => p.id === id);
    
    if (pago) {
        const detalles = `
PACIENTE: ${pago.paciente}
MONTO: ${CONFIG_BOLIVIA.moneda} ${pago.monto.toFixed(2)}
MÉTODO: ${traducirMetodoPago(pago.metodo)}
ESTADO: ${pago.estado === 'pagado' ? 'PAGADO' : 'PENDIENTE'}
FECHA: ${formatearFecha(pago.fecha)}
RECIBO: R-${pago.numeroRecibo.toString().padStart(3, '0')}
${pago.descripcion ? `DESCRIPCIÓN: ${pago.descripcion}` : ''}
        `;
        
        alert(detalles);
    }
}

function imprimirReciboPago(id) {
    const pago = pagosRegistrados.find(p => p.id === id);
    
    if (pago) {
        // Cambiar a pestaña de recibo
        cambiarTab('recibo');
        
        // Seleccionar el pago en el dropdown
        const selectReciboPaciente = document.getElementById('recibo-paciente-select');
        selectReciboPaciente.value = id;
        
        // Generar y luego imprimir el recibo
        setTimeout(() => {
            generarRecibo();
            setTimeout(() => imprimirRecibo(), 500);
        }, 300);
    }
}

// ============================================
// DATOS DE EJEMPLO (OPCIONAL)
// ============================================

function cargarDatosEjemplo() {
    if (pagosRegistrados.length === 0) {
        const datosEjemplo = [
            {
                id: 1001,
                pacienteId: "1",
                paciente: "Juan Pérez López",
                monto: 150.75,
                metodo: "efectivo",
                estado: "pagado",
                descripcion: "Consulta general",
                fecha: new Date(2024, 4, 15, 10, 30).toISOString(),
                numeroRecibo: 1,
                fechaRegistro: "15/05/2024",
                fechaCompleta: "15/05/2024, 10:30"
            },
            {
                id: 1002,
                pacienteId: "2",
                paciente: "María González Sánchez",
                monto: 250.00,
                metodo: "tpv",
                estado: "pagado",
                descripcion: "Análisis de laboratorio",
                fecha: new Date(2024, 4, 16, 14, 45).toISOString(),
                numeroRecibo: 2,
                fechaRegistro: "16/05/2024",
                fechaCompleta: "16/05/2024, 14:45"
            },
            {
                id: 1003,
                pacienteId: "3",
                paciente: "Carlos Rodríguez Martínez",
                monto: 120.50,
                metodo: "transferencia",
                estado: "pendiente",
                descripcion: "Control rutinario",
                fecha: new Date(2024, 4, 17, 9, 15).toISOString(),
                numeroRecibo: 3,
                fechaRegistro: "17/05/2024",
                fechaCompleta: "17/05/2024, 09:15"
            }
        ];
        
        pagosRegistrados = datosEjemplo;
        localStorage.setItem(DB_NAME, JSON.stringify(pagosRegistrados));
        siguienteNumeroRecibo = 4;
        
        // Actualizar selects
        actualizarSelectRecibo();
        cargarHistorial();
        
        mostrarAlerta('📊 Se han cargado datos de ejemplo para demostración', 'info');
    }
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

// Función para limpiar todos los datos (solo para desarrollo)
function limpiarDatos() {
    if (confirm('¿Estás seguro de que quieres eliminar todos los datos? Esto no se puede deshacer.')) {
        localStorage.removeItem(DB_NAME);
        pagosRegistrados = [];
        siguienteNumeroRecibo = 1;
        actualizarSelectRecibo();
        cargarHistorial();
        mostrarAlerta('🗑️ Todos los datos han sido eliminados', 'info');
    }
}

// Teclas de acceso rápido
document.addEventListener('keydown', (e) => {
    // Ctrl+1 = Registrar Pago
    if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        cambiarTab('registrar');
    }
    // Ctrl+2 = Emitir Recibo
    if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        cambiarTab('recibo');
    }
    // Ctrl+3 = Historial
    if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        cambiarTab('historial');
    }
    // Esc = Cerrar modales
    if (e.key === 'Escape') {
        cerrarTodosModales();
    }
});

console.log('🎉 Sistema de Pagos Bolivia listo para usar!');