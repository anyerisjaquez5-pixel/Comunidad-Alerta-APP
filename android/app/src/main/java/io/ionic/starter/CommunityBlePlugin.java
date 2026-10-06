package io.ionic.starter;

import android.Manifest;
import android.bluetooth.*;
import android.bluetooth.le.*;
import android.content.Context;
import android.os.Build;
import android.os.ParcelUuid;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@CapacitorPlugin(name = "CommunityBle", permissions = {
    @Permission(alias = "ble", strings = { Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_ADVERTISE })
})
public class CommunityBlePlugin extends Plugin {
    private static final UUID SERVICE = UUID.fromString("6d491400-69ac-4a20-8dca-3982152dd301");
    private static final UUID NOTE = UUID.fromString("6d491401-69ac-4a20-8dca-3982152dd301");
    private BluetoothGattServer server;
    private BluetoothLeAdvertiser advertiser;
    private PluginCall pending;
    private byte[] payload;
    private final AdvertiseCallback advertiseCallback = new AdvertiseCallback() {
        @Override public void onStartSuccess(AdvertiseSettings settings) {
            if (pending != null) { pending.resolve(); pending = null; }
        }
        @Override public void onStartFailure(int code) { fail("No se pudo anunciar la nota por BLE: " + code); }
    };

    @PluginMethod public void start(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31 && getPermissionState("ble") != PermissionState.GRANTED) {
            requestPermissionForAlias("ble", call, "permissionsResult");
            return;
        }
        startAuthorized(call);
    }

    @PermissionCallback private void permissionsResult(PluginCall call) {
        if (getPermissionState("ble") != PermissionState.GRANTED) {
            call.reject("Permiso Bluetooth rechazado");
            return;
        }
        startAuthorized(call);
    }

    private void startAuthorized(PluginCall call) {
        if (pending != null) { call.reject("Hay una operación BLE en curso"); return; }
        close();
        String value = call.getString("nota");
        if (value == null || value.getBytes(StandardCharsets.UTF_8).length > 512) {
            call.reject("Nota BLE inválida o demasiado grande"); return;
        }
        payload = value.getBytes(StandardCharsets.UTF_8);
        pending = call;
        try {
            BluetoothManager manager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
            BluetoothAdapter adapter = manager.getAdapter();
            if (adapter == null || !adapter.isEnabled()) { fail("Activa Bluetooth en los ajustes"); return; }
            advertiser = adapter.getBluetoothLeAdvertiser();
            if (advertiser == null) { fail("El teléfono no admite anuncios BLE"); return; }
            // Publica la nota como característica de solo lectura
            server = manager.openGattServer(getContext(), new BluetoothGattServerCallback() {
                @Override public void onServiceAdded(int status, BluetoothGattService service) {
                    if (status != BluetoothGatt.GATT_SUCCESS) { fail("No se pudo crear el servicio BLE"); return; }
                    try {
                        advertiser.startAdvertising(new AdvertiseSettings.Builder()
                            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                            .setConnectable(true).setTimeout(0).build(),
                            new AdvertiseData.Builder().addServiceUuid(new ParcelUuid(SERVICE)).build(),
                            advertiseCallback);
                    } catch (Exception error) { fail(error.getMessage()); }
                }
                @Override public void onCharacteristicReadRequest(BluetoothDevice device, int requestId,
                        int offset, BluetoothGattCharacteristic characteristic) {
                    byte[] current = payload;
                    if (server == null) return;
                    if (!NOTE.equals(characteristic.getUuid()) || current == null || offset > current.length || offset < 0) {
                        server.sendResponse(device, requestId, BluetoothGatt.GATT_INVALID_OFFSET, offset, null);
                        return;
                    }
                    // Android fragmenta la respuesta según el MTU del cliente
                    byte[] remaining = java.util.Arrays.copyOfRange(current, offset, current.length);
                    server.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, remaining);
                }
            });
            if (server == null) { fail("No se pudo abrir el receptor BLE"); return; }
            BluetoothGattService service = new BluetoothGattService(SERVICE, BluetoothGattService.SERVICE_TYPE_PRIMARY);
            service.addCharacteristic(new BluetoothGattCharacteristic(NOTE,
                BluetoothGattCharacteristic.PROPERTY_READ, BluetoothGattCharacteristic.PERMISSION_READ));
            if (!server.addService(service)) fail("No se pudo agregar el servicio BLE");
        } catch (Exception error) { fail(error.getMessage()); }
    }

    private void fail(String message) {
        PluginCall call = pending;
        pending = null;
        close();
        if (call != null) call.reject(message == null ? "Error BLE" : message);
    }

    private void close() {
        try { if (advertiser != null) advertiser.stopAdvertising(advertiseCallback); } catch (Exception ignored) {}
        try { if (server != null) server.close(); } catch (Exception ignored) {}
        advertiser = null;
        server = null;
        payload = null;
    }

    @PluginMethod public void stop(PluginCall call) {
        fail("Publicación BLE cancelada");
        call.resolve();
    }

    @Override protected void handleOnPause() { fail("Publicación BLE interrumpida"); }
    @Override protected void handleOnDestroy() { fail("Publicación BLE finalizada"); }
}
