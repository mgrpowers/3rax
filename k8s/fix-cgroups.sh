#!/bin/bash
# Fix cgroups issue on Raspberry Pi for K3s

set -e

echo "==========================================="
echo "K3s Cgroup Fix for Raspberry Pi"
echo "==========================================="
echo ""

# Check if running on Raspberry Pi
if [ ! -f /proc/device-tree/model ]; then
    echo "⚠️  Warning: This doesn't appear to be a Raspberry Pi"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Determine which cmdline file to use
if [ -f /boot/firmware/cmdline.txt ]; then
    CMDLINE_FILE="/boot/firmware/cmdline.txt"
    echo "Using: $CMDLINE_FILE (Bookworm/newer)"
elif [ -f /boot/cmdline.txt ]; then
    CMDLINE_FILE="/boot/cmdline.txt"
    echo "Using: $CMDLINE_FILE (Bullseye/older)"
else
    echo "❌ Error: Could not find cmdline.txt"
    echo "Searched:"
    echo "  - /boot/firmware/cmdline.txt"
    echo "  - /boot/cmdline.txt"
    exit 1
fi

echo ""
echo "Current boot parameters:"
cat "$CMDLINE_FILE"
echo ""

# Check if cgroups are already enabled
if grep -q "cgroup_memory=1" "$CMDLINE_FILE" && grep -q "cgroup_enable=memory" "$CMDLINE_FILE"; then
    echo "✅ Cgroups are already enabled in $CMDLINE_FILE"
    echo ""
    echo "Checking if they're active..."
    if cat /proc/cgroups | grep -q memory; then
        echo "✅ Memory cgroups are active!"
        echo ""
        echo "K3s should work. If you're still having issues, try:"
        echo "  sudo systemctl restart k3s"
        exit 0
    else
        echo "⚠️  Cgroups are configured but not active. Reboot required."
        echo ""
        read -p "Reboot now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo reboot
        else
            echo "Please reboot manually: sudo reboot"
        fi
        exit 0
    fi
fi

echo "Adding cgroup parameters to boot configuration..."
echo ""

# Backup original file
sudo cp "$CMDLINE_FILE" "${CMDLINE_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
echo "✅ Backup created: ${CMDLINE_FILE}.backup-$(date +%Y%m%d-%H%M%S)"

# Add cgroup parameters (everything must be on one line!)
sudo sed -i '$ s/$/ cgroup_memory=1 cgroup_enable=memory/' "$CMDLINE_FILE"

echo ""
echo "Updated boot parameters:"
cat "$CMDLINE_FILE"
echo ""

echo "✅ Cgroup parameters added successfully!"
echo ""
echo "⚠️  IMPORTANT: You must reboot for changes to take effect"
echo ""
read -p "Reboot now? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Rebooting in 5 seconds... (Ctrl+C to cancel)"
    sleep 5
    sudo reboot
else
    echo ""
    echo "Please reboot manually when ready:"
    echo "  sudo reboot"
    echo ""
    echo "After reboot, verify cgroups are active:"
    echo "  cat /proc/cgroups | grep memory"
    echo ""
    echo "Then install/restart K3s:"
    echo "  curl -sfL https://get.k3s.io | sh -s - server --write-kubeconfig-mode 644"
fi
